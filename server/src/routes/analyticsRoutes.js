const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', (req, res, next) => analyticsController.getDashboardAnalytics(req, res, next));

module.exports = router;
