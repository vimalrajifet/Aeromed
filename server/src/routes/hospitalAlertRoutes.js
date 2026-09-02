const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', (req, res, next) => hospitalController.getAlerts(req, res, next));
router.post('/', authorizeRoles('OPERATOR', 'DRIVER', 'MEDICAL_TEAM', 'ADMIN'), (req, res, next) => hospitalController.createAlert(req, res, next));
router.patch('/:id/acknowledge', authorizeRoles('HOSPITAL_COORD', 'ADMIN'), (req, res, next) => hospitalController.acknowledgeAlert(req, res, next));

module.exports = router;
