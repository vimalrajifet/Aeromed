const prisma = require('../config/prisma');
const allocationEngine = require('./allocationEngine');
const { logAudit } = require('../middleware/audit');

class EmergencyService {
  /**
   * Generates sequential unique Case Number e.g. EMG-2026-0011
   */
  async generateCaseNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.emergencyCase.count();
    const nextNum = String(count + 1).padStart(4, '0');
    return `EMG-${year}-${nextNum}`;
  }

  /**
   * Creates a new emergency case
   */
  async createCase(data, user, ipAddress) {
    const {
      callerName,
      callerPhone,
      emergencyType,
      priority,
      description,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      destinationHospitalId
    } = data;

    if (!callerName || !callerPhone || !emergencyType || !priority || !pickupAddress) {
      const err = new Error('Missing required emergency case fields (callerName, callerPhone, emergencyType, priority, pickupAddress)');
      err.statusCode = 400;
      throw err;
    }

    if (pickupLatitude === undefined || pickupLongitude === undefined) {
      const err = new Error('Pickup coordinates (latitude and longitude) are required');
      err.statusCode = 400;
      throw err;
    }

    const caseNumber = await this.generateCaseNumber();

    const newCase = await prisma.emergencyCase.create({
      data: {
        caseNumber,
        callerName,
        callerPhone,
        emergencyType,
        priority,
        description: description || null,
        pickupAddress,
        pickupLatitude: parseFloat(pickupLatitude),
        pickupLongitude: parseFloat(pickupLongitude),
        destinationHospitalId: destinationHospitalId || null,
        status: 'OPEN'
      },
      include: {
        destinationHospital: true
      }
    });

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'CASE_CREATED',
      entityType: 'EmergencyCase',
      entityId: newCase.id,
      details: { caseNumber, priority, emergencyType, callerName },
      ipAddress
    });

    // Create system notification for dispatchers
    await prisma.notification.create({
      data: {
        recipientRole: 'OPERATOR',
        title: `🚨 New Emergency: ${caseNumber}`,
        message: `${priority} - ${emergencyType} at ${pickupAddress}. Immediate dispatch required.`,
        type: priority === 'P1_CRITICAL' ? 'CRITICAL' : 'ALERT'
      }
    });

    // Generate immediate rule-based allocation recommendation
    const recommendation = await allocationEngine.recommendAmbulance(newCase);

    return {
      emergencyCase: newCase,
      recommendation
    };
  }

  /**
   * Retrieves emergency cases with optional filtering
   */
  async getCases(filters = {}) {
    const { status, priority, search, page = 1, limit = 50 } = filters;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { caseNumber: { contains: search } },
        { callerName: { contains: search } },
        { callerPhone: { contains: search } },
        { pickupAddress: { contains: search } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [cases, total] = await Promise.all([
      prisma.emergencyCase.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          destinationHospital: true,
          assignedAmbulance: true,
          crewAssignments: {
            include: {
              employee: true
            }
          }
        }
      }),
      prisma.emergencyCase.count({ where })
    ]);

    return { cases, total, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Retrieves single case by ID with full relationships
   */
  async getCaseById(id) {
    const emergencyCase = await prisma.emergencyCase.findUnique({
      where: { id },
      include: {
        destinationHospital: true,
        assignedAmbulance: {
          include: {
            inventory: {
              include: { medicalItem: true }
            }
          }
        },
        crewAssignments: {
          include: { employee: true }
        },
        hospitalAlerts: {
          include: { hospital: true }
        },
        locationHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 20
        },
        inventoryTransactions: {
          include: { medicalItem: true },
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!emergencyCase) {
      const err = new Error(`Emergency Case ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    return emergencyCase;
  }

  /**
   * Recommends ambulance for an existing case
   */
  async getRecommendation(id) {
    const emergencyCase = await this.getCaseById(id);
    return await allocationEngine.recommendAmbulance(emergencyCase);
  }

  /**
   * Assigns an ambulance and crew members to an emergency case
   */
  async assignAmbulanceAndCrew(id, payload, user, ipAddress) {
    const { ambulanceId, driverEmployeeId, medicalEmployeeId, notes } = payload;

    const emergencyCase = await prisma.emergencyCase.findUnique({ where: { id } });
    if (!emergencyCase) {
      const err = new Error('Emergency case not found');
      err.statusCode = 404;
      throw err;
    }

    if (['CLOSED', 'CANCELLED'].includes(emergencyCase.status)) {
      const err = new Error(`Cannot assign resources to a ${emergencyCase.status} case`);
      err.statusCode = 400;
      throw err;
    }

    // Verify Ambulance Availability
    const ambulance = await prisma.ambulance.findUnique({ where: { id: ambulanceId } });
    if (!ambulance) {
      const err = new Error('Ambulance not found');
      err.statusCode = 404;
      throw err;
    }

    if (ambulance.status === 'MAINTENANCE' || ambulance.status === 'OFFLINE') {
      const err = new Error(`Cannot assign ambulance in '${ambulance.status}' status`);
      err.statusCode = 400;
      throw err;
    }

    // Transaction to update Case, Ambulance, and Crew
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Case status
      const updatedCase = await tx.emergencyCase.update({
        where: { id },
        data: {
          assignedAmbulanceId: ambulanceId,
          status: 'ASSIGNED'
        }
      });

      // 2. Update Ambulance status
      await tx.ambulance.update({
        where: { id: ambulanceId },
        data: { status: 'ASSIGNED' }
      });

      // 3. Clear previous pending assignments if reassigning
      await tx.crewAssignment.deleteMany({
        where: { emergencyCaseId: id }
      });

      // 4. Assign Driver
      if (driverEmployeeId) {
        const driver = await tx.employee.findUnique({ where: { id: driverEmployeeId } });
        if (driver && driver.availabilityStatus === 'AVAILABLE') {
          await tx.crewAssignment.create({
            data: {
              emergencyCaseId: id,
              ambulanceId,
              employeeId: driverEmployeeId,
              roleInCase: 'PRIMARY_DRIVER'
            }
          });
          await tx.employee.update({
            where: { id: driverEmployeeId },
            data: { availabilityStatus: 'ASSIGNED' }
          });
        }
      }

      // 5. Assign Medical Team member
      if (medicalEmployeeId) {
        const medic = await tx.employee.findUnique({ where: { id: medicalEmployeeId } });
        if (medic && medic.availabilityStatus === 'AVAILABLE') {
          await tx.crewAssignment.create({
            data: {
              emergencyCaseId: id,
              ambulanceId,
              employeeId: medicalEmployeeId,
              roleInCase: medic.role === 'DOCTOR' ? 'LEAD_PHYSICIAN' : 'PRIMARY_PARAMEDIC'
            }
          });
          await tx.employee.update({
            where: { id: medicalEmployeeId },
            data: { availabilityStatus: 'ASSIGNED' }
          });
        }
      }

      return updatedCase;
    });

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'AMBULANCE_ASSIGNED',
      entityType: 'EmergencyCase',
      entityId: id,
      details: {
        ambulanceId,
        registrationNumber: ambulance.registrationNumber,
        driverEmployeeId,
        medicalEmployeeId
      },
      ipAddress
    });

    // Notify Driver
    await prisma.notification.create({
      data: {
        recipientRole: 'DRIVER',
        title: `Assignment: ${emergencyCase.caseNumber}`,
        message: `Assigned to ${emergencyCase.emergencyType} at ${emergencyCase.pickupAddress}. Open Driver Portal to accept.`,
        type: 'ALERT'
      }
    });

    return await this.getCaseById(id);
  }
}

module.exports = new EmergencyService();
