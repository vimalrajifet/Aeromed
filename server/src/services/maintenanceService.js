const prisma = require('../config/prisma');
const { logAudit } = require('../middleware/audit');

class MaintenanceService {
  async generateOrderNumber() {
    const count = await prisma.maintenanceOrder.count();
    const nextNum = String(count + 1).padStart(3, '0');
    return `WO-${new Date().getFullYear()}-${nextNum}`;
  }

  async getOrders(filters = {}) {
    const { ambulanceId, status } = filters;
    const where = {};
    if (ambulanceId) where.ambulanceId = ambulanceId;
    if (status && status !== 'ALL') where.status = status;

    return await prisma.maintenanceOrder.findMany({
      where,
      include: {
        ambulance: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Creates a maintenance work order (SAP PM Notification & Order)
   * Automatically locks ambulance by setting status to MAINTENANCE
   */
  async createOrder(payload, user, ipAddress) {
    const { ambulanceId, maintenanceType, issueDescription, priority, scheduledDate, performedBy } = payload;

    if (!ambulanceId || !maintenanceType || !issueDescription) {
      const err = new Error('Ambulance ID, maintenance type, and issue description are required');
      err.statusCode = 400;
      throw err;
    }

    const ambulance = await prisma.ambulance.findUnique({ where: { id: ambulanceId } });
    if (!ambulance) {
      const err = new Error('Ambulance not found');
      err.statusCode = 404;
      throw err;
    }

    const orderNumber = await this.generateOrderNumber();

    const [order, updatedAmbulance] = await prisma.$transaction([
      prisma.maintenanceOrder.create({
        data: {
          orderNumber,
          ambulanceId,
          maintenanceType,
          issueDescription,
          priority: priority || 'MEDIUM',
          scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
          status: 'IN_PROGRESS',
          performedBy: performedBy || 'Authorized Fleet Technician'
        },
        include: { ambulance: true }
      }),
      // Set ambulance to MAINTENANCE to ensure allocation engine ignores it
      prisma.ambulance.update({
        where: { id: ambulanceId },
        data: { status: 'MAINTENANCE' }
      })
    ]);

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'MAINTENANCE_ORDER_CREATED',
      entityType: 'MaintenanceOrder',
      entityId: order.id,
      details: {
        orderNumber,
        ambulance: ambulance.registrationNumber,
        type: maintenanceType,
        issue: issueDescription
      },
      ipAddress
    });

    await prisma.notification.create({
      data: {
        recipientRole: 'FLEET_MGR',
        title: `🔧 Maintenance Order: ${orderNumber}`,
        message: `${ambulance.registrationNumber} flagged for ${maintenanceType}. Vehicle status switched to MAINTENANCE.`,
        type: 'WARNING'
      }
    });

    return order;
  }

  /**
   * Completes or updates work order
   * If status = COMPLETED, restores ambulance to AVAILABLE
   */
  async updateOrder(id, payload, user, ipAddress) {
    const { status, technicianNotes, completedDate } = payload;

    const order = await prisma.maintenanceOrder.findUnique({
      where: { id },
      include: { ambulance: true }
    });

    if (!order) {
      const err = new Error('Maintenance order not found');
      err.statusCode = 404;
      throw err;
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (technicianNotes) updateData.technicianNotes = technicianNotes;

    const isCompleting = status === 'COMPLETED';
    if (isCompleting) {
      updateData.completedDate = completedDate ? new Date(completedDate) : new Date();
    }

    const [updatedOrder] = await prisma.$transaction([
      prisma.maintenanceOrder.update({
        where: { id },
        data: updateData,
        include: { ambulance: true }
      }),
      ...(isCompleting
        ? [
            prisma.ambulance.update({
              where: { id: order.ambulanceId },
              data: {
                status: 'AVAILABLE',
                lastServiceDate: new Date()
              }
            })
          ]
        : [])
    ]);

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: `MAINTENANCE_ORDER_${status || 'UPDATED'}`,
      entityType: 'MaintenanceOrder',
      entityId: id,
      details: {
        orderNumber: order.orderNumber,
        ambulance: order.ambulance.registrationNumber,
        status,
        technicianNotes
      },
      ipAddress
    });

    if (isCompleting) {
      await prisma.notification.create({
        data: {
          recipientRole: 'OPERATOR',
          title: `✅ Fleet Ready: ${order.ambulance.registrationNumber}`,
          message: `Maintenance ${order.orderNumber} completed. Vehicle returned to AVAILABLE status for dispatch.`,
          type: 'INFO'
        }
      });
    }

    return updatedOrder;
  }
}

module.exports = new MaintenanceService();
