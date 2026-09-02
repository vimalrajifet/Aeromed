const prisma = require('../config/prisma');

/**
 * Rule-Based Ambulance & Crew Allocation Engine
 *
 * Architecture Note:
 * This allocation engine is strictly rule-based (Distance 40%, Type 25%, Crew 20%, Equipment 15%).
 * It does NOT use artificial intelligence or black-box heuristics.
 */

// Earth radius in kilometers for Haversine calculation
const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates Great-Circle Distance between two coordinates in kilometers using Haversine formula
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

class AllocationEngine {
  /**
   * Recommends the best suitable available ambulance and crew for an emergency case
   * @param {Object} emergencyCase - The emergency case entity with pickup coordinates and priority
   */
  async recommendAmbulance(emergencyCase) {
    const { pickupLatitude, pickupLongitude, priority, emergencyType } = emergencyCase;

    // 1. Retrieve ambulances with status 'AVAILABLE'.
    // Strictly exclude any vehicle in MAINTENANCE or OFFLINE
    const candidateAmbulances = await prisma.ambulance.findMany({
      where: {
        status: 'AVAILABLE'
      },
      include: {
        inventory: {
          include: {
            medicalItem: true
          }
        }
      }
    });

    if (candidateAmbulances.length === 0) {
      return {
        recommended: null,
        candidates: [],
        reason: 'No available ambulances found in fleet. All vehicles are currently on trip, undergoing maintenance, or offline.'
      };
    }

    // 2. Fetch available personnel for crew matching
    const availableEmployees = await prisma.employee.findMany({
      where: {
        availabilityStatus: 'AVAILABLE'
      }
    });

    const availableDrivers = availableEmployees.filter(e => e.role === 'DRIVER');
    const availableMedical = availableEmployees.filter(e => ['DOCTOR', 'PARAMEDIC', 'EMT'].includes(e.role));

    // 3. Score each candidate ambulance
    const scoredCandidates = candidateAmbulances.map(ambulance => {
      // Factor 1: Distance (40% weight)
      const distanceKm = calculateHaversineDistance(
        ambulance.currentLatitude,
        ambulance.currentLongitude,
        pickupLatitude,
        pickupLongitude
      );
      // Linear falloff: 0km = 100pts, 10km = 0pts
      const distanceScore = Math.max(0, Math.min(100, Math.round(100 - (distanceKm * 10))));

      // Factor 2: Ambulance Type Suitability (25% weight)
      let typeScore = 70;
      if (['P1_CRITICAL', 'CARDIAC', 'STROKE', 'TRAUMA'].includes(priority) || ['CARDIAC', 'STROKE', 'TRAUMA'].includes(emergencyType)) {
        if (ambulance.ambulanceType === 'ALS') typeScore = 100;
        else if (ambulance.ambulanceType === 'BLS') typeScore = 60;
        else typeScore = 30;
      } else if (priority === 'P2_HIGH') {
        if (ambulance.ambulanceType === 'BLS') typeScore = 100;
        else if (ambulance.ambulanceType === 'ALS') typeScore = 90;
        else typeScore = 50;
      } else {
        // P3 or P4
        if (ambulance.ambulanceType === 'PATIENT_TRANSPORT') typeScore = 100;
        else if (ambulance.ambulanceType === 'BLS') typeScore = 90;
        else typeScore = 75;
      }

      // Factor 3: Crew Availability (20% weight)
      let crewScore = 0;
      let suggestedDriver = availableDrivers[0] || null;
      let suggestedMedical = null;

      if (availableDrivers.length > 0) {
        crewScore += 50; // Driver secured
      }

      if (['P1_CRITICAL', 'CARDIAC', 'STROKE'].includes(priority)) {
        suggestedMedical = availableMedical.find(m => ['DOCTOR', 'PARAMEDIC'].includes(m.role)) || availableMedical[0] || null;
      } else {
        suggestedMedical = availableMedical[0] || null;
      }

      if (suggestedMedical) {
        if (['DOCTOR', 'PARAMEDIC'].includes(suggestedMedical.role)) {
          crewScore += 50;
        } else {
          crewScore += 35;
        }
      }

      // Factor 4: Essential Equipment Availability (15% weight)
      // Check for oxygen and basic supplies
      let equipmentScore = 100;
      const oxygenStock = ambulance.inventory.find(inv => inv.medicalItem.itemCode === 'MED-OXY-01');
      if (!oxygenStock || oxygenStock.availableQuantity < 1) {
        equipmentScore -= 40;
      }
      if (['P1_CRITICAL', 'CARDIAC'].includes(priority)) {
        const aedStock = ambulance.inventory.find(inv => inv.medicalItem.itemCode === 'MED-AED-08');
        if (!aedStock || aedStock.availableQuantity < 1) {
          equipmentScore -= 30;
        }
      }
      equipmentScore = Math.max(0, equipmentScore);

      // Weighted Total Score: Distance (40%) + Type (25%) + Crew (20%) + Equipment (15%)
      const totalScore = Number((
        (distanceScore * 0.40) +
        (typeScore * 0.25) +
        (crewScore * 0.20) +
        (equipmentScore * 0.15)
      ).toFixed(1));

      // Estimated arrival time assuming average city speed of 35 km/h
      const estimatedMinutes = Math.max(2, Math.round((distanceKm / 35) * 60));

      return {
        ambulance,
        distanceKm: Number(distanceKm.toFixed(2)),
        estimatedMinutes,
        scores: {
          distanceScore,
          typeScore,
          crewScore,
          equipmentScore,
          totalScore
        },
        suggestedCrew: {
          driver: suggestedDriver,
          medicalOfficer: suggestedMedical
        }
      };
    });

    // Sort descending by total score
    scoredCandidates.sort((a, b) => b.scores.totalScore - a.scores.totalScore);

    return {
      recommended: scoredCandidates[0] || null,
      candidates: scoredCandidates,
      calculatedAt: new Date().toISOString()
    };
  }
}

module.exports = new AllocationEngine();
