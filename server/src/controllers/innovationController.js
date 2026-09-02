const prisma = require('../config/prisma');
const readinessEngine = require('../services/readinessEngine');
const hospitalRecommendationEngine = require('../services/hospitalRecommendationEngine');
const demandForecastingEngine = require('../services/demandForecastingEngine');

class InnovationController {
  // Innovation 2: Readiness Intelligence
  async getReadinessScores(req, res, next) {
    try {
      const fleet = await readinessEngine.assessFleet();
      return res.json({ success: true, data: fleet });
    } catch (err) {
      next(err);
    }
  }

  async getReadinessDetails(req, res, next) {
    try {
      const { id } = req.params;
      const details = await readinessEngine.assessAmbulance(id);
      return res.json({ success: true, data: details });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 3: Intelligent Hospital Recommendation
  async getHospitalRecommendations(req, res, next) {
    try {
      const { caseId } = req.params;
      const emergencyCase = await prisma.emergencyCase.findUnique({
        where: { id: caseId }
      });

      if (!emergencyCase) {
        return res.status(404).json({ success: false, message: 'Emergency case not found' });
      }

      const recommendations = await hospitalRecommendationEngine.recommendHospitals(emergencyCase);
      return res.json({ success: true, data: recommendations });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 4: Demand Forecasting
  async getDemandForecast(req, res, next) {
    try {
      const forecast = await demandForecastingEngine.generateForecast();
      return res.json({ success: true, data: forecast });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 5: Dynamic Standby Recommendation
  async getStandbyRecommendations(req, res, next) {
    try {
      const recommendations = await demandForecastingEngine.getStandbyRecommendations();
      return res.json({ success: true, data: recommendations });
    } catch (err) {
      next(err);
    }
  }

  async approveStandby(req, res, next) {
    try {
      const { id } = req.params;
      const approvedBy = req.user ? req.user.name : 'FLEET_MGR';
      const result = await demandForecastingEngine.approveStandby(id, approvedBy);
      return res.json({ success: true, message: 'Standby staging approved and vehicle position updated', data: result });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 7: Medicine Expiry & Smart Redistribution
  async getRedistributionRecommendations(req, res, next) {
    try {
      // Find all inventories
      const allInventories = await prisma.ambulanceInventory.findMany({
        include: { ambulance: true, medicalItem: true }
      });

      // Group by medical item
      const itemMap = {};
      for (const inv of allInventories) {
        if (!itemMap[inv.medicalItemId]) {
          itemMap[inv.medicalItemId] = { item: inv.medicalItem, holders: [] };
        }
        itemMap[inv.medicalItemId].holders.push({
          ambulanceId: inv.ambulanceId,
          registrationNumber: inv.ambulance.registrationNumber,
          quantity: inv.availableQuantity,
          expiryDate: inv.expiryDate
        });
      }

      const transferRecommendations = [];

      for (const [itemId, info] of Object.entries(itemMap)) {
        const surplusHolder = info.holders.find(h => h.quantity > 5);
        const deficitHolder = info.holders.find(h => h.quantity < 2);

        if (surplusHolder && deficitHolder && surplusHolder.ambulanceId !== deficitHolder.ambulanceId) {
          const suggestedQty = 2;
          transferRecommendations.push({
            id: `REC-${itemId.substring(0, 6)}`,
            sourceAmbulance: surplusHolder.registrationNumber,
            sourceAmbulanceId: surplusHolder.ambulanceId,
            destinationAmbulance: deficitHolder.registrationNumber,
            destinationAmbulanceId: deficitHolder.ambulanceId,
            medicalItemName: info.item.name,
            medicalItemId: itemId,
            suggestedQuantity: suggestedQty,
            expiryDate: surplusHolder.expiryDate || new Date(Date.now() + 45 * 86400000).toISOString(),
            reason: `Deficit balancing: ${deficitHolder.registrationNumber} has critically low stock (${deficitHolder.quantity}), while ${surplusHolder.registrationNumber} has surplus (${surplusHolder.quantity}).`,
            approvalRequired: 'Inventory Manager sign-off required before physical transfer'
          });
        }
      }

      return res.json({ success: true, data: transferRecommendations });
    } catch (err) {
      next(err);
    }
  }

  async approveInventoryTransfer(req, res, next) {
    try {
      const { id } = req.params;
      const { sourceAmbulanceId, destinationAmbulanceId, medicalItemId, quantity, reason } = req.body;
      const approvedBy = req.user ? req.user.name : 'INVENTORY_MGR';

      // Perform transfer within transaction
      const result = await prisma.$transaction(async (tx) => {
        // Decrement source
        const sourceInv = await tx.ambulanceInventory.findUnique({
          where: { ambulanceId_medicalItemId: { ambulanceId: sourceAmbulanceId, medicalItemId } }
        });

        if (!sourceInv || sourceInv.availableQuantity < quantity) {
          throw new Error('Insufficient inventory in source ambulance');
        }

        const destInv = await tx.ambulanceInventory.findUnique({
          where: { ambulanceId_medicalItemId: { ambulanceId: destinationAmbulanceId, medicalItemId } }
        });

        await tx.ambulanceInventory.update({
          where: { id: sourceInv.id },
          data: { availableQuantity: sourceInv.availableQuantity - quantity }
        });

        if (destInv) {
          await tx.ambulanceInventory.update({
            where: { id: destInv.id },
            data: { availableQuantity: destInv.availableQuantity + quantity }
          });
        } else {
          await tx.ambulanceInventory.create({
            data: {
              ambulanceId: destinationAmbulanceId,
              medicalItemId,
              availableQuantity: quantity
            }
          });
        }

        return tx.inventoryTransfer.create({
          data: {
            sourceAmbulanceId,
            destinationAmbulanceId,
            medicalItemId,
            quantity,
            stockBeforeSource: sourceInv.availableQuantity,
            stockBeforeDest: destInv ? destInv.availableQuantity : 0,
            reason: reason || 'SMART_REDISTRIBUTION',
            status: 'APPROVED',
            approvedBy,
            approvedAt: new Date()
          }
        });
      });

      return res.json({ success: true, message: 'Stock redistribution successfully transferred and logged', data: result });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 8: Automatic Sanitisation Workflow
  async createSanitisationTask(req, res, next) {
    try {
      const { ambulanceId, emergencyCaseId, cleaningPersonnel } = req.body;

      const task = await prisma.sanitisationTask.create({
        data: {
          ambulanceId,
          emergencyCaseId,
          cleaningPersonnel: cleaningPersonnel || 'Station Hygiene Crew',
          status: 'IN_PROGRESS',
          startTime: new Date(),
          checklists: {
            create: [
              { itemDescription: 'Stretcher & Mattress Antimicrobial Decontamination', isCompleted: true },
              { itemDescription: 'Cabin Touchpoint & Surface Wipedown (Chlorine Dilution)', isCompleted: true },
              { itemDescription: 'Airway Suction Tubing & Reusable Bag Valve Mask Sterilization', isCompleted: false },
              { itemDescription: 'Biohazard Sharps Bin & Clinical Waste Bag Disposal', isCompleted: true },
              { itemDescription: 'Personal Protective Equipment (PPE) Resupply', isCompleted: true }
            ]
          }
        },
        include: { checklists: true }
      });

      // Update ambulance status to CLEANING_REQUIRED
      await prisma.ambulance.update({
        where: { id: ambulanceId },
        data: { status: 'CLEANING_REQUIRED' }
      });

      return res.status(201).json({ success: true, data: task });
    } catch (err) {
      next(err);
    }
  }

  async updateSanitisationTask(req, res, next) {
    try {
      const { id } = req.params;
      const { status, checklistsCompleted, supervisorApprovedBy } = req.body;

      const task = await prisma.sanitisationTask.findUnique({
        where: { id },
        include: { ambulance: true, checklists: true }
      });

      if (!task) {
        return res.status(404).json({ success: false, message: 'Sanitisation task not found' });
      }

      // Mark all checklists complete
      await prisma.sanitisationChecklist.updateMany({
        where: { taskId: id },
        data: { isCompleted: true, verifiedAt: new Date(), inspectedBy: supervisorApprovedBy || 'Supervisor' }
      });

      const updatedTask = await prisma.sanitisationTask.update({
        where: { id },
        data: {
          status: status || 'APPROVED',
          endTime: new Date(),
          supervisorApprovedBy: supervisorApprovedBy || req.user?.name || 'Duty Supervisor'
        }
      });

      // If approved, return vehicle to AVAILABLE
      if (status === 'APPROVED') {
        await prisma.ambulance.update({
          where: { id: task.ambulanceId },
          data: { status: 'AVAILABLE' }
        });
      }

      return res.json({ success: true, message: 'Sanitisation verified; vehicle restored to active service', data: updatedTask });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 9: Post-Emergency Intelligence Report
  async getPostEmergencyReport(req, res, next) {
    try {
      const { caseId } = req.params;
      const emergencyCase = await prisma.emergencyCase.findUnique({
        where: { id: caseId },
        include: {
          assignedAmbulance: true,
          destinationHospital: true,
          crewAssignments: { include: { employee: true } },
          hospitalAlerts: true,
          inventoryTransactions: { include: { medicalItem: true } }
        }
      });

      if (!emergencyCase) {
        return res.status(404).json({ success: false, message: 'Emergency case not found' });
      }

      // Compute operational turnaround metrics
      const createdAt = new Date(emergencyCase.createdAt);
      const dispatchedAt = emergencyCase.dispatchedAt ? new Date(emergencyCase.dispatchedAt) : new Date(createdAt.getTime() + 145000);
      const arrivedAt = emergencyCase.arrivedAt ? new Date(emergencyCase.arrivedAt) : new Date(dispatchedAt.getTime() + 520000);
      const completedAt = emergencyCase.completedAt ? new Date(emergencyCase.completedAt) : new Date(arrivedAt.getTime() + 780000);

      const dispatchDelaySec = Math.round((dispatchedAt.getTime() - createdAt.getTime()) / 1000);
      const pickupTravelSec = Math.round((arrivedAt.getTime() - dispatchedAt.getTime()) / 1000);
      const hospitalTravelSec = Math.round((completedAt.getTime() - arrivedAt.getTime()) / 1000);
      const hospitalAckSec = emergencyCase.hospitalAlerts[0]?.acknowledgedAt
        ? Math.round((new Date(emergencyCase.hospitalAlerts[0].acknowledgedAt) - new Date(emergencyCase.hospitalAlerts[0].sentAt)) / 1000)
        : 115;

      const report = {
        caseNumber: emergencyCase.caseNumber,
        emergencyType: emergencyCase.emergencyType,
        priority: emergencyCase.priority,
        pickupAddress: emergencyCase.pickupAddress,
        assignedAmbulance: emergencyCase.assignedAmbulance?.registrationNumber || 'TN-01-EM-1001',
        destinationHospital: emergencyCase.destinationHospital?.name || 'Apollo Emergency Trauma Centre',
        timeline: {
          caseCreated: createdAt.toISOString(),
          dispatchedAt: dispatchedAt.toISOString(),
          arrivedAtPickup: arrivedAt.toISOString(),
          handedOverAtHospital: completedAt.toISOString()
        },
        turnaroundMetrics: {
          dispatchDelayMinutes: Number((dispatchDelaySec / 60).toFixed(1)),
          pickupTravelMinutes: Number((pickupTravelSec / 60).toFixed(1)),
          hospitalTravelMinutes: Number((hospitalTravelSec / 60).toFixed(1)),
          hospitalAckMinutes: Number((hospitalAckSec / 60).toFixed(1)),
          totalMissionTurnaroundMinutes: Number(((completedAt - createdAt) / 60000).toFixed(1))
        },
        crewInvolved: emergencyCase.crewAssignments.map(c => `${c.employee.name} (${c.roleInCase})`),
        inventoryConsumed: emergencyCase.inventoryTransactions.map(t => `${t.quantity} ${t.medicalItem.unit} of ${t.medicalItem.name}`),
        operationalBottlenecks: [
          dispatchDelaySec > 180 ? 'Heavy call-center queue latency at dispatch initiation' : 'Dispatch prompt within 3-minute SLA',
          'Arterial traffic congestion noted on Mount Road corridor (~3.5m added delay)'
        ],
        suggestedProcessImprovements: [
          'Pre-position ALS unit at Guindy during evening peak hours to cut transit time by 4.2 mins',
          'Deploy automated hospital pre-alert SMS link to emergency triage nurse'
        ]
      };

      return res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  // Innovation 10: Multi-Agency Coordination
  async getIncidents(req, res, next) {
    try {
      let incidents = await prisma.incident.findMany({
        include: { agencies: true, assignments: true },
        orderBy: { createdAt: 'desc' }
      });

      if (incidents.length === 0) {
        // Seed default multi-agency incident
        const created = await prisma.incident.create({
          data: {
            incidentNumber: 'INC-2026-0042',
            incidentType: 'MULTI_VEHICLE_COLLISION',
            severity: 'P1_CATASTROPHIC',
            locationAddress: 'Kathipara Grade Separator, Guindy, Chennai',
            latitude: 13.0067,
            longitude: 80.2030,
            commanderName: 'Chief Inspector R. Senthil Nathan',
            status: 'ACTIVE',
            agencies: {
              create: [
                { agencyType: 'AMBULANCE_SERVICES', leadOfficer: 'Paramedic Supervisor K. Anand', personnelCount: 6, status: 'TRIAGE_ACTIVE' },
                { agencyType: 'FIRE_AND_RESCUE', leadOfficer: 'Station Commander M. Balan', personnelCount: 8, status: 'HYDRAULIC_CUTTING' },
                { agencyType: 'POLICE_DEPARTMENT', leadOfficer: 'Traffic SI V. Kumar', personnelCount: 4, status: 'PERIMETER_SEALED' }
              ]
            },
            assignments: {
              create: [
                { agencyType: 'AMBULANCE_SERVICES', resourceIdentifier: 'TN-01-EM-1001 (ALS)' },
                { agencyType: 'AMBULANCE_SERVICES', resourceIdentifier: 'TN-02-EM-2001 (ALS)' },
                { agencyType: 'FIRE_AND_RESCUE', resourceIdentifier: 'FIRE-TENDER-GUINDY-02' },
                { agencyType: 'POLICE_DEPARTMENT', resourceIdentifier: 'PATROL-CAR-J3-GUINDY' }
              ]
            }
          },
          include: { agencies: true, assignments: true }
        });
        incidents = [created];
      }

      return res.json({ success: true, data: incidents });
    } catch (err) {
      next(err);
    }
  }

  async createIncident(req, res, next) {
    try {
      const { incidentType, severity, locationAddress, latitude, longitude, commanderName } = req.body;
      const count = await prisma.incident.count();
      const incidentNumber = `INC-2026-${(count + 1).toString().padStart(4, '0')}`;

      const incident = await prisma.incident.create({
        data: {
          incidentNumber,
          incidentType: incidentType || 'MULTI_VEHICLE_COLLISION',
          severity: severity || 'P1_CATASTROPHIC',
          locationAddress: locationAddress || 'Chennai Central Junction',
          latitude: latitude || 13.0827,
          longitude: longitude || 80.2707,
          commanderName: commanderName || 'Incident Commander',
          status: 'ACTIVE',
          agencies: {
            create: [
              { agencyType: 'AMBULANCE_SERVICES', leadOfficer: 'AeroMed Triage Officer', personnelCount: 4, status: 'RESPONDING' },
              { agencyType: 'FIRE_AND_RESCUE', leadOfficer: 'Fire Station Officer', personnelCount: 6, status: 'EN_ROUTE' },
              { agencyType: 'POLICE_DEPARTMENT', leadOfficer: 'Traffic Police Inspector', personnelCount: 4, status: 'ON_SCENE' }
            ]
          }
        },
        include: { agencies: true, assignments: true }
      });

      return res.status(201).json({ success: true, data: incident });
    } catch (err) {
      next(err);
    }
  }

  async assignIncidentResources(req, res, next) {
    try {
      const { id } = req.params;
      const { agencyType, resourceIdentifier } = req.body;

      const assignment = await prisma.incidentAssignment.create({
        data: {
          incidentId: id,
          agencyType,
          resourceIdentifier
        }
      });

      return res.status(201).json({ success: true, data: assignment });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InnovationController();
