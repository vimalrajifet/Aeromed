const express = require('express');
const router = express.Router();
const hospitalController = require('../controllers/hospitalController');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', (req, res, next) => hospitalController.getHospitals(req, res, next));
router.get('/:id', (req, res, next) => hospitalController.getHospitalById(req, res, next));

module.exports = router;
