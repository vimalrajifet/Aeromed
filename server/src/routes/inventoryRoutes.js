const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/catalog', (req, res, next) => inventoryController.getCatalog(req, res, next));
router.get('/', (req, res, next) => inventoryController.getAmbulanceInventory(req, res, next));
router.get('/transactions', (req, res, next) => inventoryController.getTransactions(req, res, next));
router.post('/consume', authorizeRoles('DRIVER', 'MEDICAL_TEAM', 'OPERATOR', 'INVENTORY_MGR', 'ADMIN'), (req, res, next) => inventoryController.consumeStock(req, res, next));
router.post('/replenish', authorizeRoles('INVENTORY_MGR', 'FLEET_MGR', 'ADMIN'), (req, res, next) => inventoryController.replenishStock(req, res, next));

module.exports = router;
