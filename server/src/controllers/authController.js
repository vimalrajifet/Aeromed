const authService = require('../services/authService');

class AuthController {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const result = await authService.login(username, password, ipAddress);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, email, phone } = req.body;
      const prisma = require('../config/prisma');
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (email !== undefined) updateData.email = email ? email.trim() : null;
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;

      const updated = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
      });

      const { passwordHash: _, ...sanitized } = updated;
      res.status(200).json({
        success: true,
        data: sanitized
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
