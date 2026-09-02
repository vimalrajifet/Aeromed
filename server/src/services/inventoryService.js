const prisma = require('../config/prisma');
const { logAudit } = require('../middleware/audit');

class InventoryService {
  async getCatalog() {
    return await prisma.medicalItem.findMany({
      orderBy: { name: 'asc' }
    });
  }

  async getAmbulanceInventory(ambulanceId) {
    const where = {};
    if (ambulanceId && ambulanceId !== 'ALL') {
      where.ambulanceId = ambulanceId;
    }

    const inventory = await prisma.ambulanceInventory.findMany({
      where,
      include: {
        ambulance: true,
        medicalItem: true
      },
      orderBy: { medicalItem: { name: 'asc' } }
    });

    // Annotate with low stock and near expiry warnings
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    return inventory.map(item => {
      const isLowStock = item.availableQuantity <= item.medicalItem.minimumQuantity;
      const isNearExpiry = item.expiryDate ? new Date(item.expiryDate) <= thirtyDaysAhead : false;
      const isExpired = item.expiryDate ? new Date(item.expiryDate) < now : false;

      return {
        ...item,
        alerts: {
          isLowStock,
          isNearExpiry,
          isExpired
        }
      };
    });
  }

  /**
   * Records material consumption (SAP MM Goods Issue)
   * Strictly prevents negative stock levels
   */
  async consumeStock(payload, user, ipAddress) {
    const { ambulanceId, medicalItemId, quantity, emergencyCaseId, remarks } = payload;

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      const err = new Error('Consumption quantity must be a positive integer');
      err.statusCode = 400;
      throw err;
    }

    // Find stock record
    const stock = await prisma.ambulanceInventory.findUnique({
      where: {
        ambulanceId_medicalItemId: {
          ambulanceId,
          medicalItemId
        }
      },
      include: {
        medicalItem: true,
        ambulance: true
      }
    });

    if (!stock) {
      const err = new Error('Inventory record not found for this vehicle and medical item');
      err.statusCode = 404;
      throw err;
    }

    // STRICT VALIDATION: Prevent negative stock
    if (stock.availableQuantity < qty) {
      const err = new Error(
        `Insufficient inventory. Requested ${qty} ${stock.medicalItem.unit}s, but only ${stock.availableQuantity} available on ${stock.ambulance.registrationNumber}.`
      );
      err.statusCode = 400;
      throw err;
    }

    const newQuantity = stock.availableQuantity - qty;

    // Atomic transaction for updating stock and recording transaction
    const [updatedStock, transaction] = await prisma.$transaction([
      prisma.ambulanceInventory.update({
        where: { id: stock.id },
        data: { availableQuantity: newQuantity }
      }),
      prisma.inventoryTransaction.create({
        data: {
          ambulanceId,
          medicalItemId,
          emergencyCaseId: emergencyCaseId || null,
          transactionType: 'CONSUMPTION',
          quantity: qty,
          performedBy: user?.name || 'Authorized Staff',
          remarks: remarks || `Consumed during emergency call`
        },
        include: {
          medicalItem: true,
          ambulance: true
        }
      })
    ]);

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'STOCK_CONSUMED',
      entityType: 'AmbulanceInventory',
      entityId: stock.id,
      details: {
        ambulance: stock.ambulance.registrationNumber,
        item: stock.medicalItem.name,
        consumed: qty,
        remaining: newQuantity
      },
      ipAddress
    });

    // Trigger Low-Stock Notification if threshold breached
    if (newQuantity <= stock.medicalItem.minimumQuantity) {
      await prisma.notification.create({
        data: {
          recipientRole: 'INVENTORY_MGR',
          title: `⚠️ Low Stock Alert: ${stock.ambulance.registrationNumber}`,
          message: `${stock.medicalItem.name} level is at ${newQuantity} ${stock.medicalItem.unit} (Minimum threshold: ${stock.medicalItem.minimumQuantity}). Replenishment required.`,
          type: 'WARNING'
        }
      });
    }

    return {
      stock: updatedStock,
      transaction,
      remainingQuantity: newQuantity
    };
  }

  /**
   * Replenishes stock (SAP MM Goods Receipt)
   */
  async replenishStock(payload, user, ipAddress) {
    const { ambulanceId, medicalItemId, quantity, remarks, expiryDate } = payload;

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      const err = new Error('Replenishment quantity must be a positive integer');
      err.statusCode = 400;
      throw err;
    }

    const stock = await prisma.ambulanceInventory.findUnique({
      where: {
        ambulanceId_medicalItemId: { ambulanceId, medicalItemId }
      },
      include: { medicalItem: true, ambulance: true }
    });

    if (!stock) {
      const err = new Error('Inventory record not found for this vehicle and medical item');
      err.statusCode = 404;
      throw err;
    }

    const newQuantity = stock.availableQuantity + qty;
    const updateData = { availableQuantity: newQuantity };
    if (expiryDate) {
      updateData.expiryDate = new Date(expiryDate);
    }

    const [updatedStock, transaction] = await prisma.$transaction([
      prisma.ambulanceInventory.update({
        where: { id: stock.id },
        data: updateData
      }),
      prisma.inventoryTransaction.create({
        data: {
          ambulanceId,
          medicalItemId,
          transactionType: 'REPLENISHMENT',
          quantity: qty,
          performedBy: user?.name || 'Inventory Manager',
          remarks: remarks || `Replenished warehouse stock`
        },
        include: {
          medicalItem: true,
          ambulance: true
        }
      })
    ]);

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'STOCK_REPLENISHED',
      entityType: 'AmbulanceInventory',
      entityId: stock.id,
      details: {
        ambulance: stock.ambulance.registrationNumber,
        item: stock.medicalItem.name,
        added: qty,
        newQuantity
      },
      ipAddress
    });

    return { stock: updatedStock, transaction, newQuantity };
  }

  async getTransactions(filters = {}) {
    const { ambulanceId, medicalItemId, type, limit = 50 } = filters;
    const where = {};
    if (ambulanceId) where.ambulanceId = ambulanceId;
    if (medicalItemId) where.medicalItemId = medicalItemId;
    if (type) where.transactionType = type;

    return await prisma.inventoryTransaction.findMany({
      where,
      include: {
        ambulance: true,
        medicalItem: true,
        emergencyCase: true
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });
  }
}

module.exports = new InventoryService();
