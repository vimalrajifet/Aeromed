const prisma = require('../config/prisma');

/**
 * GPS Telematics Simulator
 * Educational simulation: Interpolates coordinates along sample Chennai road waypoints
 * Emits updates every 5 seconds into LocationHistory & Ambulance model
 */

// Sample waypoint corridors across Chennai (e.g., Mount Road / Anna Salai, Poonamallee High Road, GST Road)
const SAMPLE_CORRIDORS = [
  // Greams Road -> Anna Salai -> Guindy
  [
    { lat: 13.0604, lng: 80.2496 },
    { lat: 13.0532, lng: 80.2460 },
    { lat: 13.0450, lng: 80.2410 },
    { lat: 13.0360, lng: 80.2310 },
    { lat: 13.0240, lng: 80.2180 },
    { lat: 13.0110, lng: 80.2070 },
    { lat: 13.0076, lng: 80.2045 }
  ],
  // Anna Nagar -> Central Station (EVR Periyar Salai)
  [
    { lat: 13.0850, lng: 80.2101 },
    { lat: 13.0830, lng: 80.2250 },
    { lat: 13.0815, lng: 80.2420 },
    { lat: 13.0805, lng: 80.2600 },
    { lat: 13.0818, lng: 80.2773 }
  ],
  // Adyar -> Greams Road
  [
    { lat: 13.0067, lng: 80.2575 },
    { lat: 13.0180, lng: 80.2550 },
    { lat: 13.0330, lng: 80.2520 },
    { lat: 13.0480, lng: 80.2505 },
    { lat: 13.0604, lng: 80.2496 }
  ]
];

class GPSSimulator {
  constructor() {
    this.intervalHandle = null;
    this.vehicleCorridorIndex = {};
    this.vehicleWaypointIndex = {};
  }

  start(intervalMs = 5000) {
    if (this.intervalHandle) return;
    console.log(`[GPS Simulator] Started telematics tracking engine (Interval: ${intervalMs}ms)`);

    this.intervalHandle = setInterval(async () => {
      try {
        await this.step();
      } catch (err) {
        console.error('[GPS Simulator] Error during telematics tick:', err.message);
      }
    }, intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[GPS Simulator] Telematics simulation stopped.');
    }
  }

  async step() {
    // Find active trip ambulances, or all available vehicles to simulate live telematics
    const ambulances = await prisma.ambulance.findMany({
      where: {
        status: { in: ['ON_TRIP', 'ASSIGNED', 'AVAILABLE'] }
      },
      include: {
        assignedCases: {
          where: { status: { in: ['DISPATCHED', 'EN_ROUTE_TO_PICKUP', 'EN_ROUTE_TO_HOSPITAL'] } },
          take: 1
        }
      }
    });

    for (let i = 0; i < ambulances.length; i++) {
      const amb = ambulances[i];
      const corridor = SAMPLE_CORRIDORS[i % SAMPLE_CORRIDORS.length];
      
      let wpIdx = this.vehicleWaypointIndex[amb.id] || 0;
      let nextWpIdx = (wpIdx + 1) % corridor.length;
      this.vehicleWaypointIndex[amb.id] = nextWpIdx;

      const targetPoint = corridor[nextWpIdx];

      // Add slight randomized drift for realistic GPS jitter (approx 15-30 meters)
      const jitterLat = (Math.random() - 0.5) * 0.0004;
      const jitterLng = (Math.random() - 0.5) * 0.0004;

      const newLat = Number((targetPoint.lat + jitterLat).toFixed(6));
      const newLng = Number((targetPoint.lng + jitterLng).toFixed(6));
      const speed = amb.status === 'ON_TRIP' ? Math.round(35 + Math.random() * 25) : 0; // 35 - 60 km/h

      const activeCase = amb.assignedCases[0];

      // Atomic update of current vehicle position and insertion into breadcrumb history
      await prisma.$transaction([
        prisma.ambulance.update({
          where: { id: amb.id },
          data: {
            currentLatitude: newLat,
            currentLongitude: newLng
          }
        }),
        prisma.locationHistory.create({
          data: {
            ambulanceId: amb.id,
            emergencyCaseId: activeCase ? activeCase.id : null,
            latitude: newLat,
            longitude: newLng,
            speed: parseFloat(speed)
          }
        })
      ]);
    }
  }
}

module.exports = new GPSSimulator();
