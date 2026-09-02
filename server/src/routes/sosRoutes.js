const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authMiddleware } = require('../middleware/auth');

// Public mobile SOS trigger (no login required for emergencies)
router.post('/alert', sosController.createSosAlert);

// Public mobile SOS tracking status
router.get('/status/:caseId', sosController.getSosStatus);

// Control Room broadcast alert to 3 nearest ambulances (can use auth or direct trigger)
router.post('/broadcast/:caseId', sosController.broadcastToNearest);

module.exports = router;
