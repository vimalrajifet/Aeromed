const prisma = require('../config/prisma');
const { logAudit } = require('../middleware/audit');

class HospitalService {
  async getHospitals() {
    return await prisma.hospital.findMany({
      include: {
        hospitalAlerts: {
          where: { status: { in: ['SENT', 'PREPARING'] } },
          include: { emergencyCase: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async getHospitalById(id) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        hospitalAlerts: {
          include: { emergencyCase: true },
          orderBy: { sentAt: 'desc' }
        },
        emergencyCases: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!hospital) {
      const err = new Error('Hospital not found');
      err.statusCode = 404;
      throw err;
    }

    return hospital;
  }

  async createAlert(data, user, ipAddress) {
    const { emergencyCaseId, hospitalId, emergencyCategory, requiredDepartment, estimatedArrivalTime, notes } = data;

    if (!emergencyCaseId || !hospitalId) {
      const err = new Error('Emergency case ID and Hospital ID are required');
      err.statusCode = 400;
      throw err;
    }

    const emergencyCase = await prisma.emergencyCase.findUnique({
      where: { id: emergencyCaseId },
      include: { assignedAmbulance: true }
    });

    if (!emergencyCase) {
      const err = new Error('Associated emergency case not found');
      err.statusCode = 404;
      throw err;
    }

    if (['CLOSED', 'CANCELLED'].includes(emergencyCase.status)) {
      const err = new Error(`Cannot dispatch pre-alert for ${emergencyCase.status} case`);
      err.statusCode = 400;
      throw err;
    }

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) {
      const err = new Error('Hospital not found');
      err.statusCode = 404;
      throw err;
    }

    // Update destination hospital on emergency case if not already set
    if (!emergencyCase.destinationHospitalId) {
      await prisma.emergencyCase.update({
        where: { id: emergencyCaseId },
        data: { destinationHospitalId: hospitalId }
      });
    }

    const alert = await prisma.hospitalAlert.create({
      data: {
        emergencyCaseId,
        hospitalId,
        emergencyCategory: emergencyCategory || emergencyCase.emergencyType,
        requiredDepartment: requiredDepartment || 'EMERGENCY_TRAUMA',
        estimatedArrivalTime: estimatedArrivalTime ? new Date(estimatedArrivalTime) : null,
        status: 'SENT',
        notes: notes || null
      },
      include: {
        hospital: true,
        emergencyCase: {
          include: { assignedAmbulance: true }
        }
      }
    });

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'HOSPITAL_ALERT_SENT',
      entityType: 'HospitalAlert',
      entityId: alert.id,
      details: {
        hospitalName: hospital.name,
        caseNumber: emergencyCase.caseNumber,
        category: alert.emergencyCategory,
        requiredDepartment: alert.requiredDepartment
      },
      ipAddress
    });

    // Notify Hospital Coordinator
    await prisma.notification.create({
      data: {
        recipientRole: 'HOSPITAL_COORD',
        title: `🚨 Inbound Pre-Alert: ${emergencyCase.caseNumber}`,
        message: `${alert.emergencyCategory} inbound. ETA: ${estimatedArrivalTime || 'En-Route'}. Trauma bay preparation requested.`,
        type: 'CRITICAL'
      }
    });

    return alert;
  }

  async acknowledgeAlert(alertId, payload, user, ipAddress) {
    const { status = 'ACKNOWLEDGED', notes } = payload;

    const alert = await prisma.hospitalAlert.findUnique({
      where: { id: alertId },
      include: { hospital: true, emergencyCase: true }
    });

    if (!alert) {
      const err = new Error('Hospital alert not found');
      err.statusCode = 404;
      throw err;
    }

    const updatedAlert = await prisma.hospitalAlert.update({
      where: { id: alertId },
      data: {
        status,
        acknowledgedAt: new Date(),
        notes: notes ? `${alert.notes || ''} | [Response]: ${notes}` : alert.notes
      },
      include: { hospital: true, emergencyCase: true }
    });

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: `HOSPITAL_ALERT_${status}`,
      entityType: 'HospitalAlert',
      entityId: alertId,
      details: { hospitalName: alert.hospital.name, caseNumber: alert.emergencyCase.caseNumber, status, notes },
      ipAddress
    });

    // Notify Control Room Operator of acknowledgment
    await prisma.notification.create({
      data: {
        recipientRole: 'OPERATOR',
        title: `Hospital ${status}: ${alert.emergencyCase.caseNumber}`,
        message: `${alert.hospital.name} has marked alert as ${status}. Bay preparation confirmed.`,
        type: 'INFO'
      }
    });

    return updatedAlert;
  }

  async getAlerts(filters = {}) {
    const { hospitalId, status } = filters;
    const where = {};
    if (hospitalId) where.hospitalId = hospitalId;
    if (status && status !== 'ALL') where.status = status;

    return await prisma.hospitalAlert.findMany({
      where,
      include: {
        hospital: true,
        emergencyCase: {
          include: {
            assignedAmbulance: true,
            crewAssignments: { include: { employee: true } }
          }
        }
      },
      orderBy: { sentAt: 'desc' }
    });
  }
}

module.exports = new HospitalService();
