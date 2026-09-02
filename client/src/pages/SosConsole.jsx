import React, { useState, useEffect, useMemo } from 'react';
import { sosApi, emergencyApi, ambulanceApi, hospitalApi } from '../api/endpoints';
import LiveMap from '../components/map/LiveMap';
import StatusBadge from '../components/common/StatusBadge';
import {
  Radio,
  Send,
  Truck,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  Navigation,
  Phone,
  Shield,
  ExternalLink,
  Flame,
  Volume2,
  RefreshCw,
  Heart,
  Activity,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const CHENNAI_LOCATIONS = [
  { name: 'Panagal Park, T. Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'Anna Nagar Tower Park', lat: 13.0850, lng: 80.2101 },
  { name: 'Kapaleeshwarar Temple, Mylapore', lat: 13.0335, lng: 80.2699 },
  { name: 'Adyar Signal & Bridge', lat: 13.0067, lng: 80.2570 },
  { name: 'Marina Beach Light House', lat: 13.0399, lng: 80.2785 }
];

export default function SosConsole({ onNavigateToTracking }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [allAmbulances, setAllAmbulances] = useState([]);
  const [allHospitals, setAllHospitals] = useState([]);
  const [nearestAmbulances, setNearestAmbulances] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [missionStatus, setMissionStatus] = useState('IDLE'); // IDLE, NEW, DISPATCHED, AT_PICKUP, EN_ROUTE_TO_HOSPITAL, HANDED_OVER
  const [vitalsData, setVitalsData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(CHENNAI_LOCATIONS[0]);
  const [callerName, setCallerName] = useState('Anand Kumar');
  const [recentSosCases, setRecentSosCases] = useState([]);

  // Load ambulances and hospitals for the LiveMap
  const loadFleetData = async () => {
    try {
      const [ambRes, hospRes] = await Promise.all([
        ambulanceApi.getAllAmbulances(),
        hospitalApi.getHospitals()
      ]);
      setAllAmbulances(ambRes.data.data || []);
      setAllHospitals(hospRes.data.data || []);
    } catch (e) {
      console.error('Error fetching fleet data:', e);
    }
  };

  const fetchRecentCases = async () => {
    try {
      const res = await emergencyApi.getCases({ limit: 10 });
      const allCases = res.data.data.cases || [];
      const sosCases = allCases.filter(
        (c) => c.emergencyType?.toLowerCase().includes('sos') || c.priority === 'P1_CRITICAL'
      );
      setRecentSosCases(sosCases);

      // Auto-bind the latest active SOS alert if idle
      if (!activeAlert && sosCases.length > 0) {
        const topCase = sosCases[0];
        setActiveAlert(topCase);
        if (topCase.status === 'NEW') setMissionStatus('NEW');
        else if (topCase.status === 'DISPATCHED') setMissionStatus('DISPATCHED');
        else if (topCase.status === 'AT_PICKUP') setMissionStatus('AT_PICKUP');
        else if (topCase.status === 'EN_ROUTE_TO_HOSPITAL') setMissionStatus('EN_ROUTE_TO_HOSPITAL');
        else if (topCase.status === 'HANDED_OVER' || topCase.status === 'CLOSED') setMissionStatus('HANDED_OVER');
      }
    } catch (err) {
      console.error('Failed to fetch recent SOS cases:', err);
    }
  };

  useEffect(() => {
    loadFleetData();
    fetchRecentCases();
    const interval = setInterval(() => {
      loadFleetData();
      fetchRecentCases();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute 3 nearest ambulances for any coordinate
  const computeNearestAmbulances = (lat, lng, ambs = allAmbulances) => {
    if (!ambs || ambs.length === 0) return [];
    return ambs
      .map((amb) => {
        const dLat = Math.abs(amb.currentLatitude - lat) * 111;
        const dLng = Math.abs(amb.currentLongitude - lng) * 111 * 0.97;
        const dist = Number((Math.hypot(dLat, dLng) * 1.15).toFixed(2));
        return {
          ...amb,
          distanceKm: dist,
          etaMins: Math.max(2, Math.round(dist * 2.2))
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  };

  // Recalculate nearest ambulances when activeAlert changes or location changes
  useEffect(() => {
    if (activeAlert) {
      const nearest = computeNearestAmbulances(activeAlert.pickupLatitude, activeAlert.pickupLongitude);
      setNearestAmbulances(nearest);
    } else {
      const nearest = computeNearestAmbulances(selectedLocation.lat, selectedLocation.lng);
      setNearestAmbulances(nearest);
    }
  }, [activeAlert, selectedLocation, allAmbulances]);

  // 1. Patient Triggers SOS (or operator simulates inbound call)
  const handleTriggerSos = async () => {
    try {
      setIsProcessing(true);
      const res = await sosApi.createAlert({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        callerName,
        phone: '98401-EMERGENCY',
        address: selectedLocation.name,
        emergencyType: 'Critical Trauma Alert (Mobile SOS)'
      });

      if (res.data.success) {
        const data = res.data.data;
        setActiveAlert({
          id: data.caseId,
          caseNumber: data.caseNumber,
          pickupAddress: selectedLocation.name,
          pickupLatitude: selectedLocation.lat,
          pickupLongitude: selectedLocation.lng,
          status: 'NEW',
          callerName,
          emergencyType: 'Critical Trauma Alert (Mobile SOS)',
          destinationHospital: data.destinationHospital
        });
        setNearestAmbulances(data.nearestAmbulances || computeNearestAmbulances(selectedLocation.lat, selectedLocation.lng));
        setMissionStatus('NEW');
        setVitalsData(null);
        fetchRecentCases();
      }
    } catch (err) {
      console.error('SOS Alert trigger failed:', err);
      alert('Failed to trigger SOS alert');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Control Room Accepts SOS & Dispatches Nearest Ambulance ("ON THE WAY")
  const handleAcceptAndDispatch = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const res = await sosApi.broadcastToNearest(activeAlert.id);
      if (res.data.success) {
        const leadUnit = res.data.data.assignedAmbulance;
        setActiveAlert((prev) => ({
          ...prev,
          status: 'DISPATCHED',
          assignedAmbulance: leadUnit,
          assignedAmbulanceId: leadUnit.id
        }));
        setMissionStatus('DISPATCHED');
        loadFleetData();
        fetchRecentCases();
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
      alert('Dispatch failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Paramedic Arrived at Patient ➔ Record & Send Vitals to Control Room
  const handlePatientReceived = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const vitals = {
        heartRate: '86 bpm',
        bloodPressure: '122/80 mmHg',
        spO2: '99%',
        temperature: '98.6 °F',
        consciousness: 'ALERT & STABILIZED',
        triageScore: 'P1_CONTROLLED'
      };

      const res = await sosApi.advanceMission(activeAlert.id, {
        vitals,
        notes: 'Paramedics on-scene. Patient loaded into ambulance. Vital signs streamed to Control Room.'
      });

      if (res.data.success) {
        setVitalsData(vitals);
        setMissionStatus('AT_PICKUP');
        setActiveAlert((prev) => ({ ...prev, status: 'AT_PICKUP' }));
        fetchRecentCases();
      }
    } catch (err) {
      console.error('Advance mission failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Transport Patient to Receiving Hospital
  const handleTransportToHospital = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const res = await sosApi.advanceMission(activeAlert.id, {
        notes: 'En route to Apollo Emergency Trauma Centre with green corridor clearance.'
      });
      if (res.data.success) {
        setMissionStatus('EN_ROUTE_TO_HOSPITAL');
        setActiveAlert((prev) => ({ ...prev, status: 'EN_ROUTE_TO_HOSPITAL' }));
        fetchRecentCases();
      }
    } catch (err) {
      console.error('Advance mission failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Complete Hospital Handover & Mission Success
  const handleCompleteHandover = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const res = await sosApi.advanceMission(activeAlert.id, {
        notes: 'Patient successfully received at Apollo Emergency Trauma Centre. Handover completed.'
      });
      if (res.data.success) {
        setMissionStatus('HANDED_OVER');
        setActiveAlert((prev) => ({ ...prev, status: 'HANDED_OVER' }));
        loadFleetData();
        fetchRecentCases();
      }
    } catch (err) {
      console.error('Advance mission failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Live Map coordinates and entities
  const mapCenter = useMemo(() => {
    if (activeAlert) return [activeAlert.pickupLatitude, activeAlert.pickupLongitude];
    return [selectedLocation.lat, selectedLocation.lng];
  }, [activeAlert, selectedLocation]);

  const leadAmbulance = useMemo(() => {
    if (activeAlert?.assignedAmbulance) return activeAlert.assignedAmbulance;
    if (nearestAmbulances.length > 0) return nearestAmbulances[0];
    return allAmbulances[0] || null;
  }, [activeAlert, nearestAmbulances, allAmbulances]);

  const targetHospital = useMemo(() => {
    if (activeAlert?.destinationHospital) return activeAlert.destinationHospital;
    return allHospitals[0] || null;
  }, [activeAlert, allHospitals]);

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight">SOS Mobile Dispatch Radar</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                CONTROL ROOM
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live patient SOS alert intake ➔ Compute 3 nearest ambulances ➔ Dispatch lead unit ➔ Track clinical vitals & hospital admission.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/sos"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-red-600/30 transition-transform active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Patient SOS (/sos)</span>
          </a>
        </div>
      </div>

      {/* 4-Stage Mission Flow Progress Stepper */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] text-xs">
          {/* Step 1 */}
          <div className={`flex items-center space-x-2 font-bold ${
            missionStatus === 'NEW' ? 'text-red-600 font-black' : missionStatus !== 'IDLE' ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              missionStatus === 'NEW' ? 'bg-red-600 text-white animate-pulse' : missionStatus !== 'IDLE' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>1</span>
            <span>🚨 SOS Alert (Near Patient)</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Step 2 */}
          <div className={`flex items-center space-x-2 font-bold ${
            missionStatus === 'DISPATCHED' ? 'text-blue-600 font-black' : ['AT_PICKUP', 'EN_ROUTE_TO_HOSPITAL', 'HANDED_OVER'].includes(missionStatus) ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              missionStatus === 'DISPATCHED' ? 'bg-blue-600 text-white animate-bounce' : ['AT_PICKUP', 'EN_ROUTE_TO_HOSPITAL', 'HANDED_OVER'].includes(missionStatus) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>2</span>
            <span>🚑 Ambulance On The Way</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Step 3 */}
          <div className={`flex items-center space-x-2 font-bold ${
            missionStatus === 'AT_PICKUP' ? 'text-amber-600 font-black' : ['EN_ROUTE_TO_HOSPITAL', 'HANDED_OVER'].includes(missionStatus) ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              missionStatus === 'AT_PICKUP' ? 'bg-amber-600 text-white animate-pulse' : ['EN_ROUTE_TO_HOSPITAL', 'HANDED_OVER'].includes(missionStatus) ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>3</span>
            <span>❤️ Patient Received & Vitals Synced</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Step 4 */}
          <div className={`flex items-center space-x-2 font-bold ${
            missionStatus === 'HANDED_OVER' ? 'text-emerald-600 font-black' : missionStatus === 'EN_ROUTE_TO_HOSPITAL' ? 'text-purple-600 font-black' : 'text-slate-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              missionStatus === 'HANDED_OVER' ? 'bg-emerald-600 text-white' : missionStatus === 'EN_ROUTE_TO_HOSPITAL' ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
            }`}>4</span>
            <span>🏥 Hospital Handover Complete</span>
          </div>
        </div>
      </div>

      {/* FULL-WIDTH CONTROL ROOM DASHBOARD & MAP */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Mission Action & Alert Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-black text-lg text-slate-900">
                {activeAlert ? activeAlert.caseNumber : 'Live Emergency Intake Map'}
              </h2>
              {activeAlert && <StatusBadge status={activeAlert.status} />}
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">
                P1 CRITICAL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>Location: <strong>{activeAlert?.pickupAddress || selectedLocation.name}</strong></span>
              {activeAlert?.callerName && (
                <span className="ml-2 text-slate-400">• Caller: <strong className="text-slate-700">{activeAlert.callerName}</strong></span>
              )}
            </p>
          </div>

          {/* Mission Action Buttons */}
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {missionStatus === 'IDLE' && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedLocation.name}
                  onChange={(e) => {
                    const loc = CHENNAI_LOCATIONS.find((l) => l.name === e.target.value);
                    if (loc) setSelectedLocation(loc);
                  }}
                  className="bg-slate-50 text-slate-800 text-xs rounded-xl px-3 py-2 border border-slate-300 font-bold focus:outline-none"
                >
                  {CHENNAI_LOCATIONS.map((loc) => (
                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                  ))}
                </select>

                <button
                  onClick={handleTriggerSos}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-red-600/30 active:scale-95 transition-transform"
                >
                  <Flame className="w-4 h-4" />
                  <span>Trigger Inbound SOS Call</span>
                </button>
              </div>
            )}

            {missionStatus === 'NEW' && (
              <button
                onClick={handleAcceptAndDispatch}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center space-x-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-transform animate-pulse"
              >
                <Send className="w-4 h-4" />
                <span>Confirm & Dispatch Nearest Ambulance ({nearestAmbulances[0]?.registrationNumber || 'TN-01-EM-1002'})</span>
              </button>
            )}

            {missionStatus === 'DISPATCHED' && (
              <button
                onClick={handlePatientReceived}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center space-x-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-transform"
              >
                <Activity className="w-4 h-4" />
                <span>Paramedic Arrived at Patient ➔ Transmit Vitals to Control Room</span>
              </button>
            )}

            {missionStatus === 'AT_PICKUP' && (
              <button
                onClick={handleTransportToHospital}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-transform"
              >
                <Navigation className="w-4 h-4" />
                <span>Transport Patient to Apollo Emergency Trauma Centre</span>
              </button>
            )}

            {missionStatus === 'EN_ROUTE_TO_HOSPITAL' && (
              <button
                onClick={handleCompleteHandover}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition-transform"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Arrived at Hospital ➔ Complete Handover</span>
              </button>
            )}

            {missionStatus === 'HANDED_OVER' && (
              <div className="flex items-center space-x-2">
                <div className="px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Mission Completed Successfully!</span>
                </div>
                <button
                  onClick={() => {
                    setMissionStatus('IDLE');
                    setActiveAlert(null);
                    setVitalsData(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  New Mission
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Clinical Vitals Data Box (Transmitted when Paramedics Attend Patient) */}
        {vitalsData && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="font-black text-sm">Patient Clinical Vitals Streamed to Control Room:</span>
            </div>
            <div className="flex items-center space-x-5 font-mono text-xs">
              <div>Heart Rate: <strong className="text-red-700 text-sm">{vitalsData.heartRate}</strong></div>
              <div>Blood Pressure: <strong className="text-slate-900 text-sm">{vitalsData.bloodPressure}</strong></div>
              <div>SpO2: <strong className="text-blue-700 text-sm">{vitalsData.spO2}</strong></div>
              <div>Status: <strong className="text-emerald-700 text-sm">{vitalsData.triageScore}</strong></div>
            </div>
          </div>
        )}

        {/* 3 Nearest Ambulances Alerted in this Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <span>🚑 3 Nearest Ambulances Alerted in this Area:</span>
            </h3>
            <span className="text-[11px] text-blue-600 font-bold">
              Automatic Road Distance Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {nearestAmbulances.slice(0, 3).map((amb, index) => {
              const isDispatched = activeAlert?.assignedAmbulanceId === amb.id || (index === 0 && missionStatus !== 'IDLE');
              return (
                <div
                  key={amb.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isDispatched
                      ? 'border-blue-500 bg-blue-50/70 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {index === 0 ? '🥇 1st Nearest (Lead)' : index === 1 ? '🥈 2nd Nearest' : '🥉 3rd Nearest'}
                    </span>
                    <StatusBadge status={amb.status} />
                  </div>
                  <div className="mt-2 font-black text-base text-slate-900">{amb.registrationNumber}</div>
                  <div className="text-xs text-slate-500">{amb.ambulanceType} Grade</div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex justify-between text-xs">
                    <span className="text-slate-600">Distance: <strong>{amb.distanceKm} km</strong></span>
                    <span className="text-emerald-600 font-bold">ETA ~{amb.etaMins} mins</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FULL-WIDTH MISSION MAP */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
          <LiveMap
            ambulances={allAmbulances}
            hospitals={allHospitals}
            selectedCase={activeAlert ? {
              ...activeAlert,
              pickupLatitude: activeAlert.pickupLatitude,
              pickupLongitude: activeAlert.pickupLongitude,
              assignedAmbulance: leadAmbulance,
              destinationHospital: targetHospital
            } : null}
            selectedAmbulance={leadAmbulance}
            center={mapCenter}
            zoom={13}
            height="520px"
          />
        </div>
      </div>
    </div>
  );
}
