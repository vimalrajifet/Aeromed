const prisma = require('../config/prisma');

const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

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

class HospitalRecommendationEngine {
  /**
   * Recommend top 3 hospitals for an emergency case based on multi-factor clinical & operational scoring
   * @param {Object} emergencyCase
   */
  async recommendHospitals(emergencyCase) {
    const { pickupLatitude, pickupLongitude, emergencyType } = emergencyCase;

    // Map emergency type to required primary department
    const deptMapping = {
      CARDIAC: 'CARDIOLOGY',
      TRAUMA: 'TRAUMA_CARE',
      ACCIDENT: 'TRAUMA_CARE',
      RESPIRATORY: 'ICU',
      STROKE: 'NEUROLOGY',
      MATERNITY: 'PEDIATRICS',
      GENERAL: 'TRAUMA_CARE'
    };
    const requiredDept = deptMapping[emergencyType?.toUpperCase()] || 'TRAUMA_CARE';

    const hospitals = await prisma.hospital.findMany({
      include: {
        capabilities: true,
        availabilityRecords: {
          orderBy: { reportedAt: 'desc' },
          take: 1
        }
      }
    });

    if (hospitals.length === 0) {
      return [];
    }

    const scoredHospitals = hospitals.map((hosp) => {
      // 1. Department Match Factor (30%)
      const availableDepts = hosp.availableDepartments.split(',').map(d => d.trim().toUpperCase());
      const hasDept = availableDepts.includes(requiredDept) || availableDepts.includes('TRAUMA_CARE');
      const deptScore = hasDept ? 100 : 35;

      // 2. Reported Resource Availability (25%)
      const avail = hosp.availabilityRecords[0];
      const status = avail ? avail.status : hosp.availabilityStatus;
      let availScore = 80;
      if (status === 'ACCEPTING') availScore = 100;
      else if (status === 'FULL') availScore = 30;
      else if (status === 'DIVERTING') availScore = 10;

      // 3. Distance and ETA Factor (25%)
      const distKm = calculateHaversineDistance(pickupLatitude, pickupLongitude, hosp.latitude, hosp.longitude);
      const etaMins = Math.max(2, Math.round(distKm * 2.2));
      // Shorter distance = higher score (100 at 0km, down to 0 at 25km)
      const etaScore = Math.max(0, Math.min(100, 100 - (distKm * 4)));

      // 4. Current Workload Factor (15%)
      const activeCount = avail ? avail.activeEmergencyCount : 2;
      const workloadScore = Math.max(20, 100 - (activeCount * 18));

      // 5. Historical Acknowledgement Performance (5%)
      const ackSec = avail ? avail.averageAckSeconds : 120.0;
      const ackScore = Math.max(30, 100 - ((ackSec - 60) * 0.5));

      // Weighted Overall Score (0 to 100)
      const overallScore = Number((
        (deptScore * 0.30) +
        (availScore * 0.25) +
        (etaScore * 0.25) +
        (workloadScore * 0.15) +
        (ackScore * 0.05)
      ).toFixed(1));

      // Explainable Rationale
      const reasons = [];
      if (hasDept) reasons.push(`Specialized ${requiredDept} Ward Available`);
      if (status === 'ACCEPTING') reasons.push('Emergency Bay Clear & Accepting');
      if (distKm < 5.0) reasons.push(`Rapid ETA ~${etaMins}m (${distKm.toFixed(1)} km)`);
      if (activeCount <= 2) reasons.push('Low Emergency Bay Workload');

      return {
        hospitalId: hosp.id,
        hospitalName: hosp.name,
        address: hosp.address,
        latitude: hosp.latitude,
        longitude: hosp.longitude,
        recommendationScore: overallScore,
        distanceKm: Number(distKm.toFixed(2)),
        etaMins,
        availableDepartment: requiredDept,
        reportedResourceStatus: status,
        activeEmergencyCount: activeCount,
        reasonForRecommendation: reasons.join(' • ') || 'Proximity and certified trauma coverage',
        disclaimer: 'Clinical decision-support recommendation only. Not a guarantee of hospital bed availability or medical treatment.'
      };
    });

    // Return Top 3 Ranked Hospitals
    return scoredHospitals.sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, 3);
  }
}

module.exports = new HospitalRecommendationEngine();
