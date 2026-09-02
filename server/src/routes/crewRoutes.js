const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const { authenticateJWT, authorizeRoles } = require('../middleware/auth');

router.use(authenticateJWT);

// Retrieve active or past crew assignments
router.get('/', async (req, res, next) => {
  try {
    const { emergencyCaseId, ambulanceId } = req.query;
    const where = {};
    if (emergencyCaseId) where.emergencyCaseId = emergencyCaseId;
    if (ambulanceId) where.ambulanceId = ambulanceId;

    const assignments = await prisma.crewAssignment.findMany({
      where,
      include: {
        employee: true,
        ambulance: true,
        emergencyCase: true
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.status(200).json({ success: true, data: assignments });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
