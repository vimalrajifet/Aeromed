const prisma = require('../config/prisma');
const { logAudit } = require('../middleware/audit');

class EmployeeController {
  async getAllEmployees(req, res, next) {
    try {
      const { role, availability, shift } = req.query;
      const where = {};
      if (role && role !== 'ALL') where.role = role;
      if (availability && availability !== 'ALL') where.availabilityStatus = availability;
      if (shift && shift !== 'ALL') where.shift = shift;

      const employees = await prisma.employee.findMany({
        where,
        include: {
          crewAssignments: {
            where: { releasedAt: null },
            include: { emergencyCase: true, ambulance: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.status(200).json({ success: true, data: employees });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableEmployees(req, res, next) {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          availabilityStatus: 'AVAILABLE'
        },
        orderBy: { role: 'asc' }
      });
      res.status(200).json({ success: true, data: employees });
    } catch (error) {
      next(error);
    }
  }

  async createEmployee(req, res, next) {
    try {
      const { employeeCode, name, role, phone, skills, shift } = req.body;
      if (!employeeCode || !name || !role || !phone) {
        return res.status(400).json({ success: false, error: 'Missing required employee fields' });
      }

      const employee = await prisma.employee.create({
        data: {
          employeeCode: employeeCode.trim().toUpperCase(),
          name: name.trim(),
          role,
          phone: phone.trim(),
          skills: skills || 'BASIC_LIFE_SUPPORT',
          shift: shift || 'MORNING',
          availabilityStatus: 'AVAILABLE'
        }
      });

      const ipAddress = req.ip || req.connection.remoteAddress;
      await logAudit({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: 'EMPLOYEE_CREATED',
        entityType: 'Employee',
        entityId: employee.id,
        details: { employeeCode: employee.employeeCode, role: employee.role },
        ipAddress
      });

      res.status(201).json({ success: true, data: employee });
    } catch (error) {
      next(error);
    }
  }

  async updateEmployee(req, res, next) {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.update({
        where: { id },
        data: req.body
      });
      res.status(200).json({ success: true, data: employee });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmployeeController();
