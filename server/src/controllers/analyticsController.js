const analyticsService = require('../services/analyticsService');

class AnalyticsController {
  async getDashboardAnalytics(req, res, next) {
    try {
      const data = await analyticsService.getDashboardAnalytics();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
