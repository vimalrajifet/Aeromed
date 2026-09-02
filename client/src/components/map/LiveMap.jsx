import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getShortestRoadRoute } from '../../services/routingService';

// Custom SVG Markers
const createVehicleIcon = (status, reg, isSelected) => {
  const color =
    status === 'ON_TRIP' ? '#dc2626' :
    status === 'AVAILABLE' ? '#16a34a' :
    status === 'MAINTENANCE' ? '#d97706' : '#64748b';

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center; cursor:pointer;">
        <div style="background-color:${color}; color:white; font-size:11px; font-weight:800; padding:3px 8px; border-radius:8px; box-shadow:0 3px 8px rgba(0,0,0,0.35); white-space:nowrap; border:${isSelected ? '2.5px solid #facc15' : '1.5px solid white'}; transform:${isSelected ? 'scale(1.12)' : 'scale(1)'}; transition:all 0.2s;">
          🚑 ${reg}
        </div>
        <div style="width:${isSelected ? '14px' : '12px'}; height:${isSelected ? '14px' : '12px'}; background-color:${color}; border:${isSelected ? '3px solid #facc15' : '2px solid white'}; border-radius:50%; margin-top:-3px; box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>
      </div>
    `,
    iconSize: [90, 45],
    iconAnchor: [45, 40],
    popupAnchor: [0, -40]
  });
};

const createPickupIcon = (label = 'Patient Pickup') => {
  return L.divIcon({
    className: 'custom-pickup-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="background-color:#dc2626; color:white; font-size:11px; font-weight:800; padding:3px 8px; border-radius:8px; box-shadow:0 3px 10px rgba(220,38,38,0.4); border:2px solid white; white-space:nowrap;">
          📍 ${label}
        </div>
        <div style="width:14px; height:14px; background-color:#dc2626; border:2px solid white; border-radius:50%; margin-top:-3px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      </div>
    `,
    iconSize: [110, 45],
    iconAnchor: [55, 40],
    popupAnchor: [0, -40]
  });
};

const createHospitalIcon = (name) => {
  return L.divIcon({
    className: 'custom-hosp-marker',
    html: `
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="background-color:#059669; color:white; font-size:11px; font-weight:800; padding:3px 8px; border-radius:8px; box-shadow:0 3px 10px rgba(5,150,105,0.4); border:2px solid white; white-space:nowrap;">
          🏥 ${name || 'Hospital'}
        </div>
        <div style="width:14px; height:14px; background-color:#059669; border:2px solid white; border-radius:50%; margin-top:-3px;"></div>
      </div>
    `,
    iconSize: [110, 45],
    iconAnchor: [55, 40],
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
              icon={createHospitalIcon(hosp.name.split(' ')[0])}
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
