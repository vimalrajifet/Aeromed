const prisma = require('../config/prisma');
const { logAudit } = require('../middleware/audit');

// Strict transition graph for emergency dispatch lifecycle
const VALID_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['EN_ROUTE_TO_PICKUP', 'CANCELLED'],
  EN_ROUTE_TO_PICKUP: ['AT_PICKUP', 'CANCELLED'],
  AT_PICKUP: ['EN_ROUTE_TO_HOSPITAL', 'CANCELLED'],
  EN_ROUTE_TO_HOSPITAL: ['ARRIVED_AT_HOSPITAL', 'CANCELLED'],
  ARRIVED_AT_HOSPITAL: ['HANDED_OVER', 'CANCELLED'],
  HANDED_OVER: ['CLOSED'],
  CLOSED: [],
  CANCELLED: []
};

class DispatchService {
  /**
   * Dispatches the assigned ambulance
   */
  async dispatchCase(caseId, user, ipAddress) {
    const emergencyCase = await prisma.emergencyCase.findUnique({
      where: { id: caseId },
      include: { assignedAmbulance: true, crewAssignments: true }
    });

    if (!emergencyCase) {
      const err = new Error('Emergency case not found');
      err.statusCode = 404;
      throw err;
    }

    if (emergencyCase.status !== 'ASSIGNED') {
      const err = new Error(`Cannot dispatch case in '${emergencyCase.status}' status. Ambulance and crew must be assigned first.`);
      err.statusCode = 400;
      throw err;
    }

    if (!emergencyCase.assignedAmbulanceId) {
      const err = new Error('No ambulance assigned to this emergency case');
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.emergencyCase.update({
        where: { id: caseId },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: now
        }
      }),
      prisma.ambulance.update({
        where: { id: emergencyCase.assignedAmbulanceId },
        data: {
          status: 'ON_TRIP'
        }
      })
    ]);

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: 'CASE_DISPATCHED',
      entityType: 'EmergencyCase',
      entityId: caseId,
      details: {
        ambulanceId: emergencyCase.assignedAmbulanceId,
        registrationNumber: emergencyCase.assignedAmbulance?.registrationNumber,
        dispatchedAt: now
      },
      ipAddress
    });

    return await prisma.emergencyCase.findUnique({
      where: { id: caseId },
      include: { assignedAmbulance: true, crewAssignments: { include: { employee: true } } }
    });
  }

  /**
   * Updates case status following rigid state machine rules
   */
  async updateStatus(caseId, nextStatus, user, ipAddress, notes = '') {
    const emergencyCase = await prisma.emergencyCase.findUnique({
      where: { id: caseId },
      include: {
        assignedAmbulance: true,
        crewAssignments: true
      }
    });

    if (!emergencyCase) {
      const err = new Error('Emergency case not found');
      err.statusCode = 404;
      throw err;
    }

    const currentStatus = emergencyCase.status;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      const err = new Error(
        `Invalid status transition from '${currentStatus}' to '${nextStatus}'. Permitted transitions: [${allowedNextStatuses.join(', ')}]`
      );
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    const updateData = { status: nextStatus };

    if (nextStatus === 'AT_PICKUP' && !emergencyCase.arrivedAt) {
      updateData.arrivedAt = now;
    }

    if (nextStatus === 'CLOSED' || nextStatus === 'CANCELLED') {
      updateData.completedAt = now;
    }

    // Execute atomic state transitions
    await prisma.$transaction(async (tx) => {
      // 1. Update Case
      await tx.emergencyCase.update({
        where: { id: caseId },
        data: updateData
      });

      // 2. If transitioning to CLOSED or CANCELLED, release vehicle and staff back to AVAILABLE
      if (['CLOSED', 'CANCELLED'].includes(nextStatus)) {
        if (emergencyCase.assignedAmbulanceId) {
          await tx.ambulance.update({
            where: { id: emergencyCase.assignedAmbulanceId },
            data: { status: 'AVAILABLE' }
          });
        }

        // Release crew members
        for (const assignment of emergencyCase.crewAssignments) {
          await tx.employee.update({
            where: { id: assignment.employeeId },
            data: { availabilityStatus: 'AVAILABLE' }
          });
          await tx.crewAssignment.update({
            where: { id: assignment.id },
            data: { releasedAt: now }
          });
        }
      }
    });

    await logAudit({
      userId: user?.id,
      userRole: user?.role,
      action: `STATUS_CHANGED_${nextStatus}`,
      entityType: 'EmergencyCase',
      entityId: caseId,
      details: { previousStatus: currentStatus, nextStatus, notes },
      ipAddress
    });

    return await prisma.emergencyCase.findUnique({
      where: { id: caseId },
      include: {
        assignedAmbulance: true,
        destinationHospital: true,
        crewAssignments: { include: { employee: true } }
      }
    });
  }
}

module.exports = new DispatchService();
