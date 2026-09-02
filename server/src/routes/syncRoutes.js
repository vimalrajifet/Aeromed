const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { authMiddleware } = require('../middleware/auth');

router.post('/events', authMiddleware, syncController.syncEvents);

module.exports = router;
