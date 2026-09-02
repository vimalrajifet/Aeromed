const inventoryService = require('../services/inventoryService');

class InventoryController {
  async getCatalog(req, res, next) {
    try {
      const items = await inventoryService.getCatalog();
      res.status(200).json({ success: true, data: items });
    } catch (error) {
      next(error);
    }
  }

  async getAmbulanceInventory(req, res, next) {
    try {
      const { ambulanceId } = req.query;
      const inventory = await inventoryService.getAmbulanceInventory(ambulanceId);
      res.status(200).json({ success: true, data: inventory });
    } catch (error) {
      next(error);
    }
  }

  async consumeStock(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await inventoryService.consumeStock(req.body, req.user, ipAddress);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async replenishStock(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await inventoryService.replenishStock(req.body, req.user, ipAddress);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req, res, next) {
    try {
      const transactions = await inventoryService.getTransactions(req.query);
      res.status(200).json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InventoryController();
