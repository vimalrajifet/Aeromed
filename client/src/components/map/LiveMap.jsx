import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getShortestRoadRoute } from '../../services/routingService';

// 1. Google Maps-style Ambulance Vehicle Marker
const createVehicleIcon = (status, reg, isSelected) => {
  const isEmergency = status === 'ON_TRIP';
  const mainColor = isEmergency ? '#dc2626' : (status === 'AVAILABLE' ? '#16a34a' : '#d97706');
  const glowShadow = isSelected
    ? '0 0 0 3px #3b82f6, 0 8px 20px rgba(0,0,0,0.35)'
    : '0 3px 10px rgba(0,0,0,0.25)';

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; transform:${isSelected ? 'scale(1.12)' : 'scale(1)'}; transition:all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); user-select:none;">
        <!-- Google Maps Vehicle Pill -->
        <div style="
          background: #ffffff;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          border-radius: 9999px;
          border: 2px solid ${mainColor};
          box-shadow: ${glowShadow};
          white-space: nowrap;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        ">
          <!-- Ambulance Icon Badge -->
          <div style="
            width: 20px;
            height: 20px;
            background: ${mainColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          ">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10H4c-1.1 0-2 .9-2 2v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
              <path d="M12 6v4"/>
              <path d="M10 8h4"/>
            </svg>
          </div>
          <!-- Registration & Status -->
          <div style="display:flex; flex-direction:column; line-height:1.15; text-align:left;">
            <span style="font-size:11px; font-weight:800; color:#0f172a; letter-spacing:0.02em;">${reg}</span>
            <span style="font-size:9px; font-weight:700; color:${mainColor}; text-transform:uppercase;">${status.replace('_', ' ')}</span>
          </div>
        </div>

        <!-- Google Maps Pin Pointer Tip -->
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${mainColor};
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
        "></div>

        <!-- Animated Emergency Siren Beacon Wave (when on trip) -->
        ${isEmergency ? `
          <div style="
            position: absolute;
            bottom: -2px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(220, 38, 38, 0.45);
            animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
        ` : ''}
      </div>
    `,
    iconSize: [115, 50],
    iconAnchor: [57, 46],
    popupAnchor: [0, -46]
  });
};

// 2. Google Maps-style Patient Emergency Marker
const createPickupIcon = (label = 'Patient Emergency') => {
  return L.divIcon({
    className: 'custom-pickup-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; user-select:none;">
        <!-- Emergency Floating Pill Badge -->
        <div style="
          background: #ea4335;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 2.5px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(234, 67, 53, 0.4);
          border: 1.5px solid white;
          white-space: nowrap;
          margin-bottom: 3px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          🚨 ${label}
        </div>

        <!-- Google Maps Teardrop Emergency Pin -->
        <div style="
          width: 32px;
          height: 40px;
          position: relative;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
        ">
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
            <!-- Teardrop Pin Body -->
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#ea4335"/>
            <!-- White Inner Circle -->
            <circle cx="16" cy="16" r="10" fill="white"/>
            <!-- Emergency Cross Symbol in Red -->
            <path d="M16 10v12M10 16h12" stroke="#ea4335" stroke-width="3.2" stroke-linecap="round"/>
          </svg>
        </div>

        <!-- Pulsing Ground Emergency Beacon -->
        <div style="
          position: absolute;
          bottom: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(234, 67, 53, 0.5);
          animation: ping 1.3s cubic-bezier(0, 0, 0.2, 1) infinite;
          z-index: -1;
        "></div>
      </div>
    `,
    iconSize: [130, 68],
    iconAnchor: [65, 64],
    popupAnchor: [0, -64]
  });
};

// 3. Google Maps-style Hospital Marker
const createHospitalIcon = (name, isDesignated = false) => {
  const pinColor = isDesignated ? '#059669' : '#1a73e8'; // Google Blue or Designated Emerald Green
  const cleanName = name ? name.replace('Emergency Trauma Centre', 'Trauma').replace('Super Speciality Hospital', 'Hospital') : 'Hospital';

  return L.divIcon({
    className: 'custom-hosp-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer; user-select:none;">
        <!-- Google Maps Hospital Teardrop Pin -->
        <div style="
          width: 30px;
          height: 38px;
          position: relative;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
        ">
          <svg width="30" height="38" viewBox="0 0 32 40" fill="none">
            <!-- Pin Body -->
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="${pinColor}"/>
            <!-- White Inner Circle -->
            <circle cx="16" cy="16" r="10" fill="white"/>
            <!-- Bold 'H' (Google Maps Hospital POI symbol) -->
            <text x="16" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="${pinColor}" text-anchor="middle">H</text>
          </svg>
        </div>

        <!-- Google Maps Style POI Label -->
        <div style="
          background: #ffffff;
          color: #0f172a;
          font-size: 10px;
          font-weight: 800;
          padding: 2.5px 7px;
          border-radius: 9999px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          border: 1px solid ${pinColor};
          white-space: nowrap;
          margin-top: -2px;
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          🏥 ${cleanName}
        </div>
      </div>
    `,
    iconSize: [140, 60],
    iconAnchor: [70, 40],
    popupAnchor: [0, -40]
  });
};

// Component to dynamically fit bounds or re-center
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
      } catch (e) {
        // Safe fallback
      }
    } else if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, bounds, map]);
  return null;
}

export default function LiveMap({
  ambulances = [],
  hospitals = [],
  selectedCase = null,
  selectedAmbulance = null,
  onSelectAmbulance = null,
  onClearSelection = null,
  center = [13.0604, 80.2496], // Chennai default
  zoom = 12,
  height = '520px'
}) {
  // Only activate routes when user has explicitly touched an ambulance or case
  const hasUserSelection = !!(selectedAmbulance || selectedCase);

  // Determine active ambulance if user selected one or a case
  const activeAmbulance = useMemo(() => {
    if (selectedAmbulance) return selectedAmbulance;
    if (selectedCase) {
      return (
        selectedCase.assignedAmbulance ||
        ambulances.find(a => a.id === selectedCase.assignedAmbulanceId) ||
        ambulances[0]
      );
    }
    return null;
  }, [selectedAmbulance, selectedCase, ambulances]);

  // Determine patient coordinates
  const patientLat = selectedCase?.pickupLatitude || (activeAmbulance ? activeAmbulance.currentLatitude + 0.025 : 13.0418);
  const patientLng = selectedCase?.pickupLongitude || (activeAmbulance ? activeAmbulance.currentLongitude - 0.015 : 80.2341);
  const patientLabel = selectedCase ? `Patient (${selectedCase.caseNumber})` : 'Patient Pickup';

  // Determine hospital coordinates
  const destinationHospital = useMemo(() => {
    if (selectedCase?.destinationHospital) return selectedCase.destinationHospital;
    if (selectedCase?.destinationHospitalId) {
      const h = hospitals.find(h => h.id === selectedCase.destinationHospitalId);
      if (h) return h;
    }
    return hospitals[0] || null;
  }, [selectedCase, hospitals]);

  const hospitalLat = destinationHospital?.latitude || 13.0604;
  const hospitalLng = destinationHospital?.longitude || 80.2496;

  // State to hold computed real road network routes
  const [redRoute, setRedRoute] = useState({
    coordinates: [],
    distanceKm: 0,
    durationMins: 0,
    source: 'Calculating...'
  });

  const [greenRoute, setGreenRoute] = useState({
    coordinates: [],
    distanceKm: 0,
    durationMins: 0,
    source: 'Calculating...'
  });

  // Calculate real road network routes only when user has touched a vehicle or case
  useEffect(() => {
    let isCancelled = false;

    if (!hasUserSelection || !activeAmbulance) {
      setRedRoute({ coordinates: [], distanceKm: 0, durationMins: 0, source: 'None' });
      setGreenRoute({ coordinates: [], distanceKm: 0, durationMins: 0, source: 'None' });
      return;
    }

    async function computeRoutes() {
      // 1. Red Route: Ambulance to Patient (Road Network)
      const red = await getShortestRoadRoute(
        activeAmbulance.currentLatitude,
        activeAmbulance.currentLongitude,
        patientLat,
        patientLng
      );

      // 2. Green Route: Patient to Hospital (Road Network)
      const green = await getShortestRoadRoute(
        patientLat,
        patientLng,
        hospitalLat,
        hospitalLng
      );

      if (!isCancelled) {
        setRedRoute(red);
        setGreenRoute(green);
      }
    }

    computeRoutes();

    return () => {
      isCancelled = true;
    };
  }, [
    hasUserSelection,
    activeAmbulance?.id,
    activeAmbulance?.currentLatitude,
    activeAmbulance?.currentLongitude,
    patientLat,
    patientLng,
    hospitalLat,
    hospitalLng
  ]);

  // Calculate map bounds when routes are active
  const bounds = useMemo(() => {
    if (!hasUserSelection || !activeAmbulance) return null;
    return [
      [activeAmbulance.currentLatitude, activeAmbulance.currentLongitude],
      [patientLat, patientLng],
      [hospitalLat, hospitalLng]
    ];
  }, [hasUserSelection, activeAmbulance, patientLat, patientLng, hospitalLat, hospitalLng]);

  return (
    <div style={{ height }} className="relative w-full overflow-hidden rounded-3xl border border-slate-200 shadow-md">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={center} zoom={zoom} bounds={bounds} />

        {/* 1. RED LINE: Shortest Road Network Route (Only when user touched vehicle/case) */}
        {hasUserSelection && redRoute.coordinates.length > 0 && (
          <Polyline
            positions={redRoute.coordinates}
            pathOptions={{
              color: '#dc2626', // Vibrant Emergency Red
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          >
            <Tooltip permanent={false} sticky>
              <div className="text-xs p-1">
                <p className="font-black text-red-600">🔴 Shortest Road Route (Ambulance ➔ Patient)</p>
                <p className="text-slate-700">Distance: <strong>{redRoute.distanceKm} km</strong> (~{redRoute.durationMins} mins)</p>
                <p className="text-[10px] text-slate-400">Road Path: {redRoute.source}</p>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* 2. GREEN LINE: Shortest Road Network Route (Only when user touched vehicle/case) */}
        {hasUserSelection && greenRoute.coordinates.length > 0 && (
          <Polyline
            positions={greenRoute.coordinates}
            pathOptions={{
              color: '#059669', // Vibrant Hospital Emerald Green
              weight: 6,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          >
            <Tooltip permanent={false} sticky>
              <div className="text-xs p-1">
                <p className="font-black text-emerald-600">🟢 Shortest Road Route (Patient ➔ Hospital)</p>
                <p className="text-slate-700">Distance: <strong>{greenRoute.distanceKm} km</strong> (~{greenRoute.durationMins} mins)</p>
                <p className="text-[10px] text-slate-400">Road Path: {greenRoute.source}</p>
              </div>
            </Tooltip>
          </Polyline>
        )}

        {/* Patient Pickup Marker (Only when user touched vehicle/case) */}
        {hasUserSelection && (
          <Marker
            position={[patientLat, patientLng]}
            icon={createPickupIcon(patientLabel)}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-red-600">📍 {patientLabel}</p>
                <p className="text-slate-700 font-medium">
                  {selectedCase?.pickupAddress || 'Panagal Park, T. Nagar, Chennai'}
                </p>
                <p className="text-slate-500">
                  Priority: <strong>{selectedCase?.priority || 'P1_CRITICAL'}</strong>
                </p>
                {redRoute.distanceKm > 0 && (
                  <p className="text-red-700 font-bold">
                    🔴 Shortest Road: {redRoute.distanceKm} km from {activeAmbulance?.registrationNumber}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hospital Markers */}
        {hospitals.map((hosp) => {
          const isDestination = hosp.id === destinationHospital?.id;
          return (
            <Marker
              key={hosp.id}
              position={[hosp.latitude, hosp.longitude]}
              icon={createHospitalIcon(hosp.name.split(' ')[0], hasUserSelection && isDestination)}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-emerald-800">🏥 {hosp.name}</p>
                  <p className="text-slate-600">{hosp.address}</p>
                  <p className="text-blue-600 font-medium">Depts: {hosp.availableDepartments}</p>
                  {hasUserSelection && isDestination && (
                    <p className="text-emerald-700 font-bold bg-emerald-50 p-1 rounded">
                      🟢 Designated Facility: {greenRoute.distanceKm} km via shortest road
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulance Markers */}
        {ambulances.map((amb) => {
          const isSelected = activeAmbulance?.id === amb.id;
          return (
            <Marker
              key={amb.id}
              position={[amb.currentLatitude, amb.currentLongitude]}
              icon={createVehicleIcon(amb.status, amb.registrationNumber, isSelected)}
              eventHandlers={{
                click: () => {
                  if (onSelectAmbulance) onSelectAmbulance(amb);
                }
              }}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900">
                    🚑 {amb.registrationNumber} ({amb.ambulanceType})
                  </p>
                  <p className="text-slate-600">Status: <span className="font-semibold">{amb.status}</span></p>
                  <p className="text-slate-600">Fuel: {amb.fuelLevel}% | Odo: {amb.odometerReading} km</p>
                  {isSelected && hasUserSelection && (
                    <p className="text-red-600 font-bold pt-1 border-t border-slate-100">
                      🔴 Active Shortest Road: {redRoute.distanceKm} km to Patient
                    </p>
                  )}
                  {!isSelected && onSelectAmbulance && (
                    <button
                      onClick={() => onSelectAmbulance(amb)}
                      className="mt-1 px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]"
                    >
                      Touch to Trace Route
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
