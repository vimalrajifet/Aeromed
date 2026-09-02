const emergencyService = require('../services/emergencyService');
const dispatchService = require('../services/dispatchService');

class EmergencyController {
  async createCase(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await emergencyService.createCase(req.body, req.user, ipAddress);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getCases(req, res, next) {
    try {
      const result = await emergencyService.getCases(req.query);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getCaseById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await emergencyService.getCaseById(id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecommendation(req, res, next) {
    try {
      const { id } = req.params;
      const result = await emergencyService.getRecommendation(id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async assignAmbulance(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await emergencyService.assignAmbulanceAndCrew(id, req.body, req.user, ipAddress);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async dispatch(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await dispatchService.dispatchCase(id, req.user, ipAddress);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await dispatchService.updateStatus(id, status, req.user, ipAddress, notes);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmergencyController();
