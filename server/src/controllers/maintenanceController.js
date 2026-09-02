const maintenanceService = require('../services/maintenanceService');

class MaintenanceController {
  async getOrders(req, res, next) {
    try {
      const orders = await maintenanceService.getOrders(req.query);
      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  }

  async createOrder(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const order = await maintenanceService.createOrder(req.body, req.user, ipAddress);
      res.status(201).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }

  async updateOrder(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const order = await maintenanceService.updateOrder(id, req.body, req.user, ipAddress);
      res.status(200).json({ success: true, data: order });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MaintenanceController();
