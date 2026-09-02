const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));
router.get('/me', authenticateJWT, (req, res, next) => authController.getCurrentUser(req, res, next));
router.patch('/profile', authenticateJWT, (req, res, next) => authController.updateProfile(req, res, next));

module.exports = router;
