const prisma = require('../config/prisma');

/**
 * Innovation 2: Ambulance Readiness Intelligence Engine
 * Computes an explainable 0 to 100 readiness score across 6 weighted operational dimensions:
 * 1. Vehicle Condition (25%)
 * 2. Essential Medical Inventory (25%)
 * 3. Fuel or Battery Level (15%)
 * 4. Crew Availability (20%)
 * 5. Cleaning & Sanitisation Status (10%)
 * 6. Communication / GPS Status (5%)
 *
 * Categories:
 * 80-100: READY
 * 60-79: LIMITED
 * 0-59: NOT READY
 */
class ReadinessEngine {
  /**
   * Assess a single ambulance and return an explainable readiness report
   * @param {String} ambulanceId
   */
  async assessAmbulance(ambulanceId) {
    const amb = await prisma.ambulance.findUnique({
      where: { id: ambulanceId },
      include: {
        inventory: {
          include: { medicalItem: true }
        },
        maintenanceOrders: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
        },
        crewAssignments: {
          where: { releasedAt: null },
          include: { employee: true }
        },
        sanitisationTasks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!amb) {
      throw new Error(`Ambulance ${ambulanceId} not found`);
    }

    const factors = [];
    const missingRequirements = [];
    let reasonLowReadiness = null;
    let correctiveAction = null;

    // 1. Vehicle Condition Factor (25%)
    let vehicleScore = 100;
    const activeMaintenance = amb.maintenanceOrders.length > 0;
    const isMaintenanceStatus = amb.status === 'MAINTENANCE';

    if (activeMaintenance || isMaintenanceStatus) {
      vehicleScore = 0;
      missingRequirements.push('Vehicle under maintenance or breakdown repair');
      reasonLowReadiness = 'Active maintenance order pending technician completion';
      correctiveAction = 'Complete scheduled maintenance and verify mechanical checklist';
    } else if (amb.odometerReading > 100000) {
      vehicleScore = 80;
    }

    factors.push({
      factorName: 'VEHICLE_CONDITION',
      weight: 0.25,
      score: vehicleScore,
      details: activeMaintenance ? 'Active work order pending' : 'Engine & chassis certified fit for duty',
      missingItems: activeMaintenance ? 'Maintenance Clearance' : null
    });

    // 2. Essential Medical Inventory Factor (25%)
    let inventoryScore = 100;
    const criticalItems = ['MED-OXY-01', 'MED-AED-01', 'MED-IV-01'];
    const missingMedItems = [];

    for (const itemCode of criticalItems) {
      const invRecord = amb.inventory.find(i => i.medicalItem.itemCode === itemCode);
      if (!invRecord || invRecord.availableQuantity < invRecord.medicalItem.minimumQuantity) {
        missingMedItems.push(invRecord ? `${invRecord.medicalItem.name} (Low: ${invRecord.availableQuantity})` : itemCode);
      }
    }

    if (missingMedItems.length > 0) {
      inventoryScore = Math.max(0, 100 - (missingMedItems.length * 40));
      missingRequirements.push(...missingMedItems);
      if (!reasonLowReadiness) reasonLowReadiness = 'Missing critical lifesaving inventory items';
      if (!correctiveAction) correctiveAction = `Replenish: ${missingMedItems.join(', ')}`;
    }

    factors.push({
      factorName: 'ESSENTIAL_INVENTORY',
      weight: 0.25,
      score: inventoryScore,
      details: missingMedItems.length === 0 ? 'All lifesaving equipment above minimum threshold' : `Deficit in ${missingMedItems.length} items`,
      missingItems: missingMedItems.join(', ') || null
    });

    // 3. Fuel or Battery Level Factor (15%)
    const fuel = amb.fuelLevel || 0;
    let fuelScore = fuel; // 0 to 100
    if (fuel < 30) {
      missingRequirements.push(`Low fuel level (${fuel.toFixed(0)}%)`);
      if (!reasonLowReadiness) reasonLowReadiness = 'Fuel reserve below operational buffer';
      if (!correctiveAction) correctiveAction = 'Refuel immediately at designated station';
    }

    factors.push({
      factorName: 'FUEL_BATTERY',
      weight: 0.15,
      score: fuelScore,
      details: `Current fuel reserve at ${fuel.toFixed(1)}%`,
      missingItems: fuel < 30 ? 'Refueling required' : null
    });

    // 4. Crew Availability Factor (20%)
    let crewScore = 100;
    const activeCrew = amb.crewAssignments;
    const hasDriver = activeCrew.some(c => c.employee.role === 'DRIVER');
    const hasMedic = activeCrew.some(c => ['PARAMEDIC', 'EMT', 'DOCTOR'].includes(c.employee.role));

    if (!hasDriver && !hasMedic) {
      crewScore = 30; // Uncrewed in depot
      missingRequirements.push('No primary driver and paramedic actively assigned');
      if (!reasonLowReadiness) reasonLowReadiness = 'Uncrewed vehicle awaiting crew shift assignment';
      if (!correctiveAction) correctiveAction = 'Assign active shift driver and paramedic in Crew Portal';
    } else if (!hasDriver || !hasMedic) {
      crewScore = 65;
      missingRequirements.push(hasDriver ? 'Missing lead paramedic' : 'Missing primary driver');
    }

    factors.push({
      factorName: 'CREW_AVAILABILITY',
      weight: 0.20,
      score: crewScore,
      details: `${activeCrew.length} crew personnel onboard (${hasDriver ? 'Driver OK' : 'No Driver'}, ${hasMedic ? 'Medic OK' : 'No Medic'})`,
      missingItems: (!hasDriver || !hasMedic) ? 'Full crew complement' : null
    });

    // 5. Sanitisation & Cleaning Status Factor (10%)
    let sanitisationScore = 100;
    const lastSanitisation = amb.sanitisationTasks[0];
    const isCleaningRequired = amb.status === 'CLEANING_REQUIRED' || (lastSanitisation && lastSanitisation.status !== 'APPROVED');

    if (isCleaningRequired) {
      sanitisationScore = 0;
      missingRequirements.push('Vehicle pending post-mission decontamination and supervisor sign-off');
      if (!reasonLowReadiness) reasonLowReadiness = 'Decontamination required following patient transport';
      if (!correctiveAction) correctiveAction = 'Execute sanitisation checklist and obtain supervisor approval';
    }

    factors.push({
      factorName: 'SANITISATION',
      weight: 0.10,
      score: sanitisationScore,
      details: isCleaningRequired ? 'Pending sanitisation checklist' : 'Decontamination certified complete',
      missingItems: isCleaningRequired ? 'Sanitisation sign-off' : null
    });

    // 6. Communication / GPS Telematics Status (5%)
    let gpsScore = 100;
    const hasValidCoords = amb.currentLatitude && amb.currentLongitude && !isNaN(amb.currentLatitude);
    if (!hasValidCoords) {
      gpsScore = 0;
      missingRequirements.push('GPS telematics signal lost');
      if (!reasonLowReadiness) reasonLowReadiness = 'Telematics offline';
      if (!correctiveAction) correctiveAction = 'Reboot mobile tracking transponder';
    }

    factors.push({
      factorName: 'GPS_COMMS',
      weight: 0.05,
      score: gpsScore,
      details: hasValidCoords ? `Signal locked at (${amb.currentLatitude.toFixed(4)}, ${amb.currentLongitude.toFixed(4)})` : 'Signal lost',
      missingItems: hasValidCoords ? null : 'GPS lock'
    });

    // Compute Overall Weighted Score
    let overallScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

    // Rule 1: A vehicle under maintenance MUST be NOT READY
    if (activeMaintenance || isMaintenanceStatus) {
      overallScore = Math.min(overallScore, 40);
    }

    // Rule 2: Missing essential lifesaving equipment caps readiness at LIMITED or NOT READY
    if (missingMedItems.length >= 2) {
      overallScore = Math.min(overallScore, 55);
    }

    overallScore = Number(overallScore.toFixed(1));

    // Categorization
    let category = 'READY';
    if (overallScore < 60) category = 'NOT_READY';
    else if (overallScore < 80) category = 'LIMITED';

    return {
      ambulanceId: amb.id,
      registrationNumber: amb.registrationNumber,
      ambulanceType: amb.ambulanceType,
      status: amb.status,
      overallScore,
      category,
      reasonLowReadiness: category === 'READY' ? 'All operational readiness parameters verified optimal' : reasonLowReadiness,
      correctiveAction: category === 'READY' ? 'Maintain standard standby posture' : correctiveAction,
      missingRequirements,
      factors
    };
  }

  /**
   * Assess all fleet ambulances
   */
  async assessFleet() {
    const allAmbs = await prisma.ambulance.findMany({ select: { id: true } });
    const results = [];
    for (const a of allAmbs) {
      const assessment = await this.assessAmbulance(a.id);
      results.push(assessment);
    }
    return results.sort((a, b) => b.overallScore - a.overallScore);
  }
}

module.exports = new ReadinessEngine();
