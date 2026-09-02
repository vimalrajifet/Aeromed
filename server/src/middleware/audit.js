const prisma = require('../config/prisma');

/**
 * Creates an immutable audit log record in SQLite
 * Designed according to SAP GRC / Audit Compliance standards
 */
async function logAudit({ userId, userRole, action, entityType, entityId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userRole: userRole || 'SYSTEM',
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : details || null,
        ipAddress: ipAddress || '127.0.0.1'
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}

module.exports = { logAudit };
