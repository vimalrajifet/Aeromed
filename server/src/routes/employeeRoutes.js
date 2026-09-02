const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', (req, res, next) => employeeController.getAllEmployees(req, res, next));
router.get('/available', (req, res, next) => employeeController.getAvailableEmployees(req, res, next));
router.post('/', authorizeRoles('ADMIN', 'OPERATOR'), (req, res, next) => employeeController.createEmployee(req, res, next));
router.patch('/:id', authorizeRoles('ADMIN', 'OPERATOR'), (req, res, next) => employeeController.updateEmployee(req, res, next));

module.exports = router;
