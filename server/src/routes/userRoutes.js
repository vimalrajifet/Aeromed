const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);
router.use(authorizeRoles('ADMIN')); // Strict Admin Only

router.get('/', (req, res, next) => userController.getAllUsers(req, res, next));
router.post('/', (req, res, next) => userController.createUser(req, res, next));
router.patch('/:id/toggle-status', (req, res, next) => userController.toggleStatus(req, res, next));

module.exports = router;
