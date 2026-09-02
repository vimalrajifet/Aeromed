const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.post('/', authorizeRoles('OPERATOR', 'ADMIN'), (req, res, next) => emergencyController.createCase(req, res, next));
router.get('/', (req, res, next) => emergencyController.getCases(req, res, next));
router.get('/:id', (req, res, next) => emergencyController.getCaseById(req, res, next));
router.post('/:id/recommend-ambulance', authorizeRoles('OPERATOR', 'ADMIN'), (req, res, next) => emergencyController.getRecommendation(req, res, next));
router.post('/:id/assign', authorizeRoles('OPERATOR', 'ADMIN'), (req, res, next) => emergencyController.assignAmbulance(req, res, next));
router.post('/:id/dispatch', authorizeRoles('OPERATOR', 'DRIVER', 'ADMIN'), (req, res, next) => emergencyController.dispatch(req, res, next));
router.patch('/:id/status', authorizeRoles('OPERATOR', 'DRIVER', 'MEDICAL_TEAM', 'HOSPITAL_COORD', 'ADMIN'), (req, res, next) => emergencyController.updateStatus(req, res, next));

module.exports = router;
