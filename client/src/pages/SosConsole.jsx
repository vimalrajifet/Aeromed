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
  const [showPhoneSimulator, setShowPhoneSimulator] = useState(true);

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

  useEffect(() => {
    loadFleetData();
    const interval = setInterval(loadFleetData, 6000);
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

  // 1. Patient Triggers SOS (from phone simulator or live alert)
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
      }
    } catch (err) {
      console.error('SOS Alert trigger failed:', err);
      alert('Failed to trigger SOS alert');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Control Room Accepts SOS & Dispatches Nearest Ambulance
  const handleAcceptAndDispatch = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const res = await sosApi.broadcastToNearest(activeAlert.id);
      if (res.data.success) {
        const updatedCase = res.data.data.case;
        const leadUnit = res.data.data.assignedAmbulance;
        setActiveAlert((prev) => ({
          ...prev,
          status: 'DISPATCHED',
          assignedAmbulance: leadUnit,
          assignedAmbulanceId: leadUnit.id
        }));
        setMissionStatus('DISPATCHED');
        loadFleetData();
      }
    } catch (err) {
      console.error('Dispatch failed:', err);
      alert('Dispatch failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Advance to Patient Received / Vitals Collected
  const handlePatientReceived = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const vitals = {
        heartRate: '86 bpm',
        bloodPressure: '122/80 mmHg',
        spO2: '99%',
        temperature: '98.6 °F',
        consciousness: 'ALERT / RESPONSIVE',
        triageScore: 'P1_STABILIZED'
      };

      const res = await sosApi.advanceMission(activeAlert.id, {
        vitals,
        notes: 'Paramedics arrived at patient. Vital signs stabilized. Patient loaded safely into ambulance.'
      });

      if (res.data.success) {
        setVitalsData(vitals);
        setMissionStatus('AT_PICKUP');
        setActiveAlert((prev) => ({ ...prev, status: 'AT_PICKUP' }));
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
        notes: 'In transit to Apollo Emergency Trauma Centre. Priority green corridor requested.'
      });
      if (res.data.success) {
        setMissionStatus('EN_ROUTE_TO_HOSPITAL');
        setActiveAlert((prev) => ({ ...prev, status: 'EN_ROUTE_TO_HOSPITAL' }));
      }
    } catch (err) {
      console.error('Advance mission failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Complete Hospital Handover & Success
  const handleCompleteHandover = async () => {
    if (!activeAlert) return;
    try {
      setIsProcessing(true);
      const res = await sosApi.advanceMission(activeAlert.id, {
        notes: 'Patient successfully received at Apollo Emergency Trauma Centre. Handover completed to Emergency Head Physician.'
      });
      if (res.data.success) {
        setMissionStatus('HANDED_OVER');
        setActiveAlert((prev) => ({ ...prev, status: 'HANDED_OVER' }));
        loadFleetData();
      }
    } catch (err) {
      console.error('Advance mission failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Live Map binding data
  const mapCenter = useMemo(() => {
    if (activeAlert) return [activeAlert.pickupLatitude, activeAlert.pickupLongitude];
    return [selectedLocation.lat, selectedLocation.lng];
  }, [activeAlert, selectedLocation]);

  const leadAmbulance = useMemo(() => {
    if (activeAlert?.assignedAmbulance) return activeAlert.assignedAmbulance;
    if (nearestAmbulances.length > 0) return nearestAmbulances[0];
    return allAmbulances[0] || null;
  }, [activeAlert, nearestAmbulances, allAmbulances]);

  // Destination hospital
  const targetHospital = useMemo(() => {
    if (activeAlert?.destinationHospital) return activeAlert.destinationHospital;
    return allHospitals[0] || null;
  }, [activeAlert, allHospitals]);

  return (
    <div className="space-y-5">
      {/* Top Mission Tracker Header */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight">SOS Mobile Dispatch & Mission Tracking</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                END-TO-END FLOW
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Live patient location ➔ Dispatch 3 nearest ambulances ➔ Patient vitals received in Control Room ➔ Hospital handover.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/sos"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center space-x-1.5 shadow-md shadow-red-600/20 transition-transform active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open on Phone (/sos)</span>
          </a>
          <button
            onClick={() => setShowPhoneSimulator(!showPhoneSimulator)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
          >
            {showPhoneSimulator ? 'Hide Phone Frame' : '📱 Show Phone Frame'}
          </button>
        </div>
      </div>

      {/* 4-Step Interactive Mission Stepper Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] text-xs">
          {/* Step 1 */}
          <div className={`flex items-center space-x-2 font-bold ${
            missionStatus === 'NEW' ? 'text-red-600 font-black' : missionStatus !== 'IDLE' ? 'text-emerald-600' : 'text-slate-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              missionStatus === 'NEW' ? 'bg-red-600 text-white animate-pulse' : missionStatus !== 'IDLE' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}>1</span>
            <span>📱 SOS Triggered (Near Patient)</span>
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
            <span>❤️ Patient Received & Vitals Sent</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Step 4 */}
          <div className={`flex items-center space-x-2 font-bold ${
            missionStatus === 'HANDED_OVER' ? 'text-emerald-600 font-black' : missionStatus === 'EN_ROUTE_TO_HOSPITAL' ? 'text-purple-600 font-black' : 'text-slate-400'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
              missionStatus === 'HANDED_OVER' ? 'bg-emerald-600 text-white' : missionStatus === 'EN_ROUTE_TO_HOSPITAL' ? 'bg-purple-600 text-white animate-pulse' : 'bg-slate-200 text-slate-600'
            }`}>4</span>
            <span>🏥 Hospital Handover Success</span>
          </div>
        </div>
      </div>

      {/* Main Mission Grid: Left = Phone (if enabled), Center = Live Map & Mission Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Phone Simulator */}
        {showPhoneSimulator && (
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
              <span className="font-bold text-slate-300">📱 Patient Mobile Phone Screen</span>
              <span className="text-[10px] text-emerald-400 font-mono">GPS Active</span>
            </div>

            {/* Mobile Screen Shell */}
            <div className="w-full max-w-[300px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-4 shadow-inner text-center text-white flex flex-col justify-between min-h-[480px]">
              {/* Notch */}
              <div className="w-24 h-3.5 bg-slate-800 rounded-full mx-auto mb-3"></div>

              {missionStatus === 'IDLE' && (
                <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                      AEROMED 911 / 108
                    </span>
                    <h4 className="text-xl font-black text-white mt-1">Tap to Call Ambulance</h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Transmits GPS location to Control Room.
                    </p>
                  </div>

                  {/* Big Glowing SOS Button */}
                  <button
                    onClick={handleTriggerSos}
                    disabled={isProcessing}
                    className="w-40 h-40 rounded-full bg-gradient-to-tr from-red-700 to-rose-500 text-white font-black text-4xl shadow-xl shadow-red-600/50 border-4 border-red-400/40 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  >
                    <span>SOS</span>
                    <span className="text-[9px] font-bold tracking-widest mt-1 opacity-80">DISPATCH NOW</span>
                  </button>

                  {/* Pick test area */}
                  <div className="w-full text-left text-xs bg-slate-900 rounded-2xl p-2.5 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">Patient GPS Area:</span>
                    <select
                      value={selectedLocation.name}
                      onChange={(e) => {
                        const loc = CHENNAI_LOCATIONS.find((l) => l.name === e.target.value);
                        if (loc) setSelectedLocation(loc);
                      }}
                      className="w-full bg-slate-800 text-white text-xs rounded-lg p-1.5 focus:outline-none border border-slate-700 font-semibold"
                    >
                      {CHENNAI_LOCATIONS.map((loc) => (
                        <option key={loc.name} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {missionStatus === 'NEW' && (
                <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-3">
                  <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h4 className="font-black text-base text-white">Alerting Control Room...</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Calculating 3 closest ambulances in {selectedLocation.name}.</p>
                  </div>

                  <div className="w-full bg-slate-900 rounded-xl p-2.5 border border-slate-800 text-left text-[11px] space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">3 Nearest Ambulances Alerted:</span>
                    {nearestAmbulances.slice(0, 3).map((amb, i) => (
                      <div key={amb.id} className="flex justify-between p-1 rounded bg-slate-800/60">
                        <span className="font-bold text-slate-200">#{i + 1} {amb.registrationNumber}</span>
                        <span className="text-blue-400 font-bold">{amb.distanceKm} km (~{amb.etaMins}m)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {missionStatus === 'DISPATCHED' && (
                <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-3">
                  <div className="w-14 h-14 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                    <span className="text-2xl animate-bounce">🚑</span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase">
                      DISPATCH ACCEPTED
                    </span>
                    <h4 className="font-black text-lg text-white mt-1">Ambulance On The Way!</h4>
                    <p className="text-[11px] text-slate-300">Sirens active. Approaching your location.</p>
                  </div>

                  <div className="w-full bg-gradient-to-r from-blue-950 to-slate-900 rounded-xl p-3 border border-blue-500/40 text-left">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[9px] text-blue-400 font-bold block">Assigned Unit</span>
                        <span className="text-lg font-black text-white">{leadAmbulance?.registrationNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 font-bold block">Estimated ETA</span>
                        <span className="text-lg font-black text-emerald-400">~{leadAmbulance?.etaMins || 4} mins</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {missionStatus === 'AT_PICKUP' && (
                <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-3">
                  <div className="w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center">
                    <span className="text-2xl">👨‍⚕️</span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase">
                      PARAMEDICS AT LOCATION
                    </span>
                    <h4 className="font-black text-lg text-white mt-1">Patient Received</h4>
                    <p className="text-[11px] text-slate-300">Vitals transmitted to Control Room.</p>
                  </div>

                  {vitalsData && (
                    <div className="w-full bg-slate-900 rounded-xl p-2.5 border border-slate-800 text-left text-xs grid grid-cols-2 gap-2">
                      <div className="p-1.5 rounded bg-slate-800">
                        <span className="text-[9px] text-slate-400 block font-bold">Heart Rate</span>
                        <span className="font-bold text-red-400">{vitalsData.heartRate}</span>
                      </div>
                      <div className="p-1.5 rounded bg-slate-800">
                        <span className="text-[9px] text-slate-400 block font-bold">Blood Pressure</span>
                        <span className="font-bold text-emerald-400">{vitalsData.bloodPressure}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {missionStatus === 'EN_ROUTE_TO_HOSPITAL' && (
                <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-3">
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center">
                    <span className="text-2xl animate-pulse">🏥</span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase">
                      IN TRANSIT TO HOSPITAL
                    </span>
                    <h4 className="font-black text-lg text-white mt-1">Heading to Apollo Trauma</h4>
                    <p className="text-[11px] text-slate-300">Trauma emergency department pre-alerted.</p>
                  </div>
                </div>
              )}

              {missionStatus === 'HANDED_OVER' && (
                <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase">
                      MISSION COMPLETE
                    </span>
                    <h4 className="font-black text-lg text-white mt-1">Successfully Admitted!</h4>
                    <p className="text-[11px] text-slate-300">Patient safely received into hospital emergency care.</p>
                  </div>

                  <button
                    onClick={() => {
                      setMissionStatus('IDLE');
                      setActiveAlert(null);
                      setVitalsData(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold mt-2"
                  >
                    Reset Simulation
                  </button>
                </div>
              )}

              {/* Bottom bar */}
              <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mt-2"></div>
            </div>
          </div>
        )}

        {/* Center/Right: LIVE MISSION MAP & DISPATCH ACTION CONSOLE */}
        <div className={`${showPhoneSimulator ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-5`}>
          {/* Mission Control Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-base text-slate-900">
                    {activeAlert ? activeAlert.caseNumber : 'Live Emergency Intake Map'}
                  </h3>
                  {activeAlert && <StatusBadge status={activeAlert.status} />}
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">
                    P1 CRITICAL
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>{activeAlert?.pickupAddress || selectedLocation.name}</span>
                </p>
              </div>

              {/* Dynamic Action Button according to current mission stage */}
              <div>
                {missionStatus === 'IDLE' && (
                  <button
                    onClick={handleTriggerSos}
                    disabled={isProcessing}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-red-600/20 active:scale-95 transition-transform"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Trigger SOS Call at {selectedLocation.name}</span>
                  </button>
                )}

                {missionStatus === 'NEW' && (
                  <button
                    onClick={handleAcceptAndDispatch}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-blue-600/30 active:scale-95 transition-transform animate-pulse"
                  >
                    <Send className="w-4 h-4" />
                    <span>Accept SOS & Dispatch Nearest Unit ({nearestAmbulances[0]?.registrationNumber || 'TN-01-EM-1002'})</span>
                  </button>
                )}

                {missionStatus === 'DISPATCHED' && (
                  <button
                    onClick={handlePatientReceived}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-amber-600/30 active:scale-95 transition-transform"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Ambulance Arrived ➔ Transmit Patient Vitals to Control Room</span>
                  </button>
                )}

                {missionStatus === 'AT_PICKUP' && (
                  <button
                    onClick={handleTransportToHospital}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-purple-600/30 active:scale-95 transition-transform"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Transport Patient to Apollo Trauma Centre</span>
                  </button>
                )}

                {missionStatus === 'EN_ROUTE_TO_HOSPITAL' && (
                  <button
                    onClick={handleCompleteHandover}
                    disabled={isProcessing}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center space-x-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-transform"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Arrived at Hospital ➔ Complete Handover</span>
                  </button>
                )}

                {missionStatus === 'HANDED_OVER' && (
                  <div className="px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center space-x-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <span>Mission Completed Successfully!</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vitals Data Banner (When Patient Received) */}
            {vitalsData && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="font-black">Patient Vitals Transmitted to Control Room:</span>
                </div>
                <div className="flex items-center space-x-4 font-mono font-bold">
                  <span>HR: <strong className="text-red-700">{vitalsData.heartRate}</strong></span>
                  <span>BP: <strong className="text-slate-800">{vitalsData.bloodPressure}</strong></span>
                  <span>SpO2: <strong className="text-blue-700">{vitalsData.spO2}</strong></span>
                  <span>Status: <strong className="text-emerald-700">{vitalsData.triageScore}</strong></span>
                </div>
              </div>
            )}

            {/* THE LIVE MAP */}
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
                height="480px"
              />
            </div>

            {/* 3 Nearest Ambulances Card List */}
            {nearestAmbulances.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-slate-800">
                    🚑 3 Nearest Ambulances in this Area:
                  </span>
                  <span className="text-[11px] text-blue-600 font-bold">
                    Automatic Road Proximity Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {nearestAmbulances.slice(0, 3).map((amb, index) => {
                    const isDispatched = activeAlert?.assignedAmbulanceId === amb.id || (index === 0 && missionStatus !== 'IDLE');
                    return (
                      <div
                        key={amb.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isDispatched
                            ? 'border-blue-500 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              index === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {index === 0 ? '🥇 1st Nearest (Lead)' : index === 1 ? '🥈 2nd Nearest' : '🥉 3rd Nearest'}
                          </span>
                          <StatusBadge status={amb.status} />
                        </div>
                        <div className="mt-2 font-black text-sm text-slate-900">{amb.registrationNumber}</div>
                        <div className="text-[11px] text-slate-500">{amb.ambulanceType} Grade</div>
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-xs">
                          <span className="text-slate-500">Distance: <strong>{amb.distanceKm} km</strong></span>
                          <span className="text-emerald-600 font-bold">ETA ~{amb.etaMins}m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
