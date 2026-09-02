const express = require('express');
const router = express.Router();
const ambulanceController = require('../controllers/ambulanceController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', (req, res, next) => ambulanceController.getAllAmbulances(req, res, next));
router.get('/:id', (req, res, next) => ambulanceController.getAmbulanceById(req, res, next));
router.post('/', authorizeRoles('ADMIN', 'FLEET_MGR'), (req, res, next) => ambulanceController.createAmbulance(req, res, next));
router.patch('/:id', authorizeRoles('ADMIN', 'FLEET_MGR', 'OPERATOR'), (req, res, next) => ambulanceController.updateAmbulance(req, res, next));
router.patch('/:id/location', authorizeRoles('ADMIN', 'OPERATOR', 'DRIVER', 'FLEET_MGR'), (req, res, next) => ambulanceController.updateLocation(req, res, next));

module.exports = router;
