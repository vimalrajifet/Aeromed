const jwt = require('jsonwebtoken');
const config = require('../config/config');
const prisma = require('../config/prisma');

/**
 * Verifies JWT from Authorization header
 */
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication token missing or invalid format'
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        employee: true,
        hospital: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User account is inactive or not found'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * Allowed roles: ADMIN, OPERATOR, DRIVER, MEDICAL_TEAM, HOSPITAL_COORD, FLEET_MGR, INVENTORY_MGR
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    // ADMIN has universal override privileges
    if (req.user.role === 'ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access forbidden: Role '${req.user.role}' is not authorized for this operation.`
    });
  };
}

module.exports = {
  authenticateJWT,
  authorizeRoles
};
