const hospitalService = require('../services/hospitalService');

class HospitalController {
  async getHospitals(req, res, next) {
    try {
      const hospitals = await hospitalService.getHospitals();
      res.status(200).json({ success: true, data: hospitals });
    } catch (error) {
      next(error);
    }
  }

  async getHospitalById(req, res, next) {
    try {
      const { id } = req.params;
      const hospital = await hospitalService.getHospitalById(id);
      res.status(200).json({ success: true, data: hospital });
    } catch (error) {
      next(error);
    }
  }

  async createAlert(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const alert = await hospitalService.createAlert(req.body, req.user, ipAddress);
      res.status(201).json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async acknowledgeAlert(req, res, next) {
    try {
      const { id } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const alert = await hospitalService.acknowledgeAlert(id, req.body, req.user, ipAddress);
      res.status(200).json({ success: true, data: alert });
    } catch (error) {
      next(error);
    }
  }

  async getAlerts(req, res, next) {
    try {
      const alerts = await hospitalService.getAlerts(req.query);
      res.status(200).json({ success: true, data: alerts });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HospitalController();
