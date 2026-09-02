const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticateJWT } = require('../middleware/auth');

router.use(authenticateJWT);

router.get('/', async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { recipientRole: userRole },
          { recipientRole: null },
          { userId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 30
    });

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
