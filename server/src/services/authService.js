const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const config = require('../config/config');
const { logAudit } = require('../middleware/audit');

class AuthService {
  async login(username, password, ipAddress) {
    if (!username || !password) {
      const error = new Error('Username and password are required');
      error.statusCode = 400;
      throw error;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
      include: {
        employee: true,
        hospital: true
      }
    });

    if (!user) {
      await logAudit({
        userRole: 'ANONYMOUS',
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: username,
        details: { reason: 'User not found' },
        ipAddress
      });
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('User account is deactivated');
      error.statusCode = 403;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await logAudit({
        userId: user.id,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        details: { reason: 'Password mismatch' },
        ipAddress
      });
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        employeeId: user.employeeId,
        hospitalId: user.hospitalId
      },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    await logAudit({
      userId: user.id,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      details: { role: user.role, username: user.username },
      ipAddress
    });

    const { passwordHash, ...sanitizedUser } = user;
    return { token, user: sanitizedUser };
  }

  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
        hospital: true
      }
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = new AuthService();
