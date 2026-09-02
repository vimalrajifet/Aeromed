import React, { useState, useEffect, useRef } from 'react';
import { ambulanceApi, emergencyApi, hospitalApi } from '../api/endpoints';
import LiveMap from '../components/map/LiveMap';
import StatusBadge from '../components/common/StatusBadge';
import {
  Radio,
  Truck,
  Fuel,
  Gauge,
  AlertTriangle,
  Navigation,
  Clock,
  MapPin,
  Building2,
  CheckCircle,
  Activity,
  X,
  Flame,
  AlertCircle
} from 'lucide-react';

export default function LiveTracking() {
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [isStale, setIsStale] = useState(false);
  const lastUpdateRef = useRef(Date.now());

  const fetchTelematics = async () => {
    try {
      const [ambRes, hospRes, casesRes] = await Promise.all([
        ambulanceApi.getAllAmbulances(),
        hospitalApi.getHospitals(),
        emergencyApi.getCases({ limit: 50 })
      ]);

      const ambList = ambRes.data.data;
      const caseList = casesRes.data.data.cases;
      setAmbulances(ambList);
      setHospitals(hospRes.data.data);
      setCases(caseList);
      const now = Date.now();
      setLastUpdate(now);
      lastUpdateRef.current = now;
      setIsStale(false);

      // Keep live coordinates synced if an ambulance was already selected by user
      setSelectedAmbulance((prev) => {
        if (!prev) return null;
        const refreshed = ambList.find((a) => a.id === prev.id);
        return refreshed || prev;
      });
    } catch (err) {
      console.error('Failed to sync telematics:', err);
    }
  };

  // User touches a vehicle from the roster
  const handleTouchAmbulance = (amb) => {
    // If already touched, toggle off
    if (selectedAmbulance?.id === amb.id) {
      handleClearSelection();
      return;
    }

    setSelectedAmbulance(amb);

    // Look for an active case specifically assigned to this ambulance
    const matchedCase = cases.find(
      (c) => c.assignedAmbulanceId === amb.id && !['CLOSED', 'CANCELLED'].includes(c.status)
    );

    // If none assigned, set selectedCase to null so LiveMap generates a pickup for THIS ambulance
    setSelectedCase(matchedCase || null);
  };

  // User touches an emergency case from the cases list
  const handleTouchCase = (c) => {
    // If already touched, toggle off
    if (selectedCase?.id === c.id) {
      handleClearSelection();
      return;
    }

    setSelectedCase(c);

    // Find assigned ambulance or first available
    let amb = ambulances.find((a) => a.id === c.assignedAmbulanceId);
    if (!amb) {
      amb = ambulances.find((a) => a.status === 'AVAILABLE') || ambulances[0];
    }
    setSelectedAmbulance(amb || null);
  };

  const handleClearSelection = () => {
    setSelectedAmbulance(null);
    setSelectedCase(null);
  };

  useEffect(() => {
    fetchTelematics();
    // 5-second interval polling to match backend simulator ticks
    const interval = setInterval(fetchTelematics, 5000);

    // Watchdog timer: alert if no updates received for >15 seconds
    const watchdog = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 15000) {
        setIsStale(true);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(watchdog);
    };
  }, []);

  const hasSelection = !!(selectedAmbulance || selectedCase);

  return (
    <div className="space-y-6">
      {/* Telematics Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Live GPS Fleet Telematics & Corridor Tracking</h1>
            <p className="text-xs text-slate-500">
              Live automated updates every 5 seconds • Touch any vehicle or emergency case to trace shortest road routes
            </p>
          </div>
        </div>

        {/* Watchdog Status & Quick Legend */}
        <div className="flex flex-wrap items-center gap-3">
          {hasSelection && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Route Tracing</span>
            </button>
          )}

          {isStale ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold flex items-center space-x-2 animate-bounce">
              <AlertTriangle className="w-4 h-4" />
              <span>GPS Signal Stale (&gt;15s since last ping)</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Telematics Stream Online</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Route Corridor Indicator Strip */}
      {hasSelection && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-sm">Active Shortest Road Tracing:</span>
            <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold">
              {selectedAmbulance?.registrationNumber || 'Ambulance'}
            </span>
            {selectedCase && (
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold">
                Case: {selectedCase.caseNumber}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse border border-white" />
              <span className="font-semibold text-red-300">
                🔴 Red Route: Ambulance ➔ Patient (Dijkstra)
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white" />
              <span className="font-semibold text-emerald-300">
                🟢 Green Route: Patient ➔ Hospital (Dijkstra)
              </span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-[10px] underline text-slate-400 hover:text-white"
            >
              [Hide]
            </button>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Vehicle Roster (1 col) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Touch Vehicle to Trace Lines
            </h2>
            <span className="text-[10px] text-slate-400 font-semibold">{ambulances.length} units</span>
          </div>

          <div className="space-y-2.5">
            {ambulances.map((amb) => {
              const isSelected = selectedAmbulance?.id === amb.id;
              return (
                <button
                  key={amb.id}
                  onClick={() => handleTouchAmbulance(amb)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all transform active:scale-98 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-black text-slate-900">{amb.registrationNumber}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      )}
                    </div>
                    <StatusBadge status={amb.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <div>Grade: <strong className="text-slate-800">{amb.ambulanceType}</strong></div>
                    <div>Fuel: <strong className="text-slate-800">{amb.fuelLevel}%</strong></div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold flex items-center justify-between">
                    <span className={isSelected ? 'text-blue-700' : 'text-slate-400'}>
                      {isSelected ? '✓ Route Active (Click to Hide)' : 'Touch to trace route ➔'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center/Right: Map + Telemetry Dashboard + Emergency Cases (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Map View */}
          <LiveMap
            ambulances={ambulances}
            hospitals={hospitals}
            selectedCase={selectedCase}
            selectedAmbulance={selectedAmbulance}
            onSelectAmbulance={handleTouchAmbulance}
            onClearSelection={handleClearSelection}
            height="520px"
          />

          {/* Active Vehicle Live Telematics Dashboard (shown when touched) */}
          {selectedAmbulance && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-black text-base text-slate-900">
                        {selectedAmbulance.registrationNumber}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {selectedAmbulance.ambulanceType} Grade
                      </span>
                      <StatusBadge status={selectedAmbulance.status} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      GPS: {selectedAmbulance.currentLatitude.toFixed(5)}, {selectedAmbulance.currentLongitude.toFixed(5)}
                    </p>
                  </div>
                </div>

                {selectedCase && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="font-bold text-slate-800">
                      Emergency Case: {selectedCase.caseNumber} ({selectedCase.emergencyType})
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">
                      📍 {selectedCase.pickupAddress}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Spec Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Telemetry Speed</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {selectedAmbulance.status === 'ON_TRIP' ? '48' : '0'} km/h
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                    <Fuel className="w-3.5 h-3.5" />
                    <span>Fuel Tank</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {selectedAmbulance.fuelLevel}%
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Odometer</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {selectedAmbulance.odometerReading} km
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-1.5 text-slate-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Last Telematics Ping</span>
                  </div>
                  <div className="text-lg font-black text-slate-900 mt-1">
                    {new Date(lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Touch Emergency Case Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span>Emergency Incidents (Touch any case to trace its shortest road route)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Clicking any case automatically connects its assigned ambulance, patient pickup, and destination hospital
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500">{cases.length} cases</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-1">
              {cases.slice(0, 6).map((c) => {
                const isCaseSelected = selectedCase?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleTouchCase(c)}
                    className={`text-left p-3.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                      isCaseSelected
                        ? 'border-red-600 bg-red-50/60 shadow-md ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{c.caseNumber}</span>
                      <StatusBadge status={c.status} />
                    </div>

                    <div className="font-semibold text-slate-800 text-[11px]">
                      {c.emergencyType} • <span className="text-red-600">{c.priority}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate">
                      📍 {c.pickupAddress}
                    </div>

                    <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">
                        {c.assignedAmbulance?.registrationNumber ? `🚑 ${c.assignedAmbulance.registrationNumber}` : 'Unassigned'}
                      </span>
                      <span className={`font-bold ${isCaseSelected ? 'text-red-600' : 'text-blue-600'}`}>
                        {isCaseSelected ? '✓ Active on map' : 'Touch to trace ➔'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
