const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', (req, res, next) => maintenanceController.getOrders(req, res, next));
router.post('/', authorizeRoles('FLEET_MGR', 'DRIVER', 'ADMIN'), (req, res, next) => maintenanceController.createOrder(req, res, next));
router.patch('/:id', authorizeRoles('FLEET_MGR', 'ADMIN'), (req, res, next) => maintenanceController.updateOrder(req, res, next));

module.exports = router;
