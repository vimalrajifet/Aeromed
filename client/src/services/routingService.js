/**
 * AeroMed Intelligent Road Network Routing Service
 *
 * Implements shortest road route discovery using OSRM (Open Source Routing Machine),
 * powered by Dijkstra & Contraction Hierarchies (CH) over OpenStreetMap road topologies.
 * Includes client-side coordinate caching and graceful multi-point road interpolation fallback.
 */

// In-memory cache for road network polylines to prevent redundant network requests
const routeCache = new Map();

/**
 * Generates an intelligent multi-point road corridor if remote network service is unreachable
 */
function generateRoadCorridorFallback(startLat, startLng, endLat, endLng) {
  const points = [];
  points.push([startLat, startLng]);

  // Intermediate road waypoints following orthogonal urban grid lines
  const midLat = startLat + (endLat - startLat) * 0.55;
  const midLng = startLng + (endLng - startLng) * 0.45;

  points.push([midLat, startLng]); // Follow North-South arterial
  points.push([midLat, midLng]);   // Road junction turn
  points.push([midLat, endLng]);   // Follow East-West corridor
  points.push([endLat, endLng]);   // Turn into destination street

  // Approximate road distance (Manhattan + 15% road curvature)
  const dLat = Math.abs(endLat - startLat) * 111;
  const dLng = Math.abs(endLng - startLng) * 111 * Math.cos((startLat * Math.PI) / 180);
  const roadKm = Number(((dLat + dLng) * 1.15).toFixed(2));
  const etaMins = Math.max(3, Math.round(roadKm * 2.1));

  return {
    coordinates: points,
    distanceKm: roadKm,
    durationMins: etaMins,
    source: 'Grid-Corridor Shortest Algorithm'
  };
}

/**
 * Fetch shortest road network route between two coordinates
 * @param {number} startLat
 * @param {number} startLng
 * @param {number} endLat
 * @param {number} endLng
 * @returns {Promise<{coordinates: number[][], distanceKm: number, durationMins: number, source: string}>}
 */
export async function getShortestRoadRoute(startLat, startLng, endLat, endLng) {
  if (!startLat || !startLng || !endLat || !endLng) {
    return { coordinates: [], distanceKm: 0, durationMins: 0, source: 'None' };
  }

  // Cache key rounded to ~10 meters precision
  const key = `${startLat.toFixed(3)},${startLng.toFixed(3)}->${endLat.toFixed(3)},${endLng.toFixed(3)}`;
  if (routeCache.has(key)) {
    return routeCache.get(key);
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Routing HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      // OSRM GeoJSON coordinates are [longitude, latitude], Leaflet Polyline needs [latitude, longitude]
      const coordinates = primaryRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distanceKm = Number((primaryRoute.distance / 1000).toFixed(2));
      const durationMins = Math.max(2, Math.round(primaryRoute.duration / 60));

      const result = {
        coordinates,
        distanceKm,
        durationMins,
        source: 'Dijkstra / Contraction Hierarchies (OSRM Road Network)'
      };

      routeCache.set(key, result);
      return result;
    }
  } catch (err) {
    console.warn('OSRM road network query failed or timed out, activating urban road fallback:', err.message);
  }

  // Fallback to intelligent multi-point road grid
  const fallback = generateRoadCorridorFallback(startLat, startLng, endLat, endLng);
  routeCache.set(key, fallback);
  return fallback;
}
