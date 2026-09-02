const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

// Only ADMIN, FLEET_MGR, and OPERATOR can view audit compliance records
router.get('/', authorizeRoles('ADMIN', 'FLEET_MGR', 'OPERATOR'), async (req, res, next) => {
  try {
    const { action, entityType, limit = 100 } = req.query;
    const where = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, name: true, role: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit)
    });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
