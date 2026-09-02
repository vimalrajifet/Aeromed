const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../middleware/audit');

class UserController {
  async getAllUsers(req, res, next) {
    try {
      const users = await prisma.user.findMany({
        include: {
          employee: true,
          hospital: true
        },
        orderBy: { name: 'asc' }
      });

      const sanitized = users.map(({ passwordHash, ...u }) => u);
      res.status(200).json({ success: true, data: sanitized });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const { username, password, name, role, email, phone, employeeId, hospitalId } = req.body;

      if (!username || !password || !name || !role) {
        return res.status(400).json({ success: false, error: 'Username, password, name, and role are required' });
      }

      const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Username already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: {
          username: username.trim(),
          passwordHash,
          name: name.trim(),
          role,
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          employeeId: employeeId || null,
          hospitalId: hospitalId || null
        }
      });

      const ipAddress = req.ip || req.connection.remoteAddress;
      await logAudit({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        details: { username: user.username, role: user.role },
        ipAddress
      });

      const { passwordHash: _, ...sanitized } = user;
      res.status(201).json({ success: true, data: sanitized });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: !user.isActive }
      });

      const { passwordHash: _, ...sanitized } = updated;
      res.status(200).json({ success: true, data: sanitized });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
