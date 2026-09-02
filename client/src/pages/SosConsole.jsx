import React, { useState, useEffect } from 'react';
import { sosApi, emergencyApi, ambulanceApi } from '../api/endpoints';
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
  Sparkles
} from 'lucide-react';

export default function SosConsole({ onNavigateToTracking }) {
  const [activeAlert, setActiveAlert] = useState(null);
  const [nearestAmbulances, setNearestAmbulances] = useState([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [recentSosCases, setRecentSosCases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Phone simulation state
  const [phoneState, setPhoneState] = useState('IDLE'); // IDLE, DISPATCHING, TRACKING
  const [phoneCase, setPhoneCase] = useState(null);
  const [phoneCaller, setPhoneCaller] = useState('Anand Kumar');
  const [phoneLocation, setPhoneLocation] = useState('Panagal Park, T. Nagar (Chennai)');

  const fetchRecentCases = async () => {
    try {
      setIsLoading(true);
      const res = await emergencyApi.getCases({ limit: 15 });
      const allCases = res.data.data.cases || [];
      const sosCases = allCases.filter(
        (c) => c.emergencyType?.toLowerCase().includes('sos') || c.priority === 'P1_CRITICAL'
      );
      setRecentSosCases(sosCases);

      // If activeAlert not set, pick the most recent open SOS case
      if (!activeAlert && sosCases.length > 0) {
        const topCase = sosCases[0];
        setActiveAlert(topCase);
        // Compute nearest ambulances for this case
        fetchNearestForCase(topCase);
      }
    } catch (err) {
      console.error('Failed to fetch SOS cases:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNearestForCase = async (c) => {
    try {
      const ambRes = await ambulanceApi.getAllAmbulances();
      const allAmbs = ambRes.data.data || [];

      // Calculate distances to this case's pickup
      const ranked = allAmbs
        .map((amb) => {
          const dLat = Math.abs(amb.currentLatitude - c.pickupLatitude) * 111;
          const dLng = Math.abs(amb.currentLongitude - c.pickupLongitude) * 111 * 0.97;
          const dist = Number((Math.hypot(dLat, dLng) * 1.15).toFixed(2));
          return {
            ...amb,
            distanceKm: dist,
            etaMins: Math.max(2, Math.round(dist * 2.2))
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 3);

      setNearestAmbulances(ranked);
    } catch (e) {
      console.error('Failed to compute nearest:', e);
    }
  };

  useEffect(() => {
    fetchRecentCases();
    const interval = setInterval(fetchRecentCases, 5000);
    return () => clearInterval(interval);
  }, []);

  // Control Room: Broadcast alert to the 3 nearest ambulances
  const handleBroadcast = async () => {
    if (!activeAlert) return;
    try {
      setIsBroadcasting(true);
      const res = await sosApi.broadcastToNearest(activeAlert.id);
      if (res.data.success) {
        setBroadcastDone(true);
        setBroadcastMessage(res.data.message);
        setActiveAlert(res.data.data.case);

        // Update phone simulation if it's the same case
        if (phoneCase && phoneCase.id === activeAlert.id) {
          setPhoneState('TRACKING');
          setPhoneCase((prev) => ({
            ...prev,
            status: 'DISPATCHED',
            assignedAmbulance: res.data.data.assignedAmbulance,
            eta: '3 mins'
          }));
        }

        fetchRecentCases();
      }
    } catch (err) {
      console.error('Broadcast failed:', err);
      alert('Broadcast dispatch error: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Simulate Triggering an SOS directly from Phone frame
  const handleSimulatePhoneSos = async () => {
    try {
      setPhoneState('DISPATCHING');
      setBroadcastDone(false);

      // Chennai T. Nagar coordinates with subtle variation
      const lat = 13.0418 + (Math.random() - 0.5) * 0.01;
      const lng = 80.2341 + (Math.random() - 0.5) * 0.01;

      const res = await sosApi.createAlert({
        latitude: lat,
        longitude: lng,
        callerName: phoneCaller,
        phone: '98401-EMERGENCY',
        address: phoneLocation,
        emergencyType: 'Critical Trauma Alert (Mobile SOS)'
      });

      if (res.data.success) {
        const newCase = res.data.data;
        setPhoneCase({
          id: newCase.caseId,
          caseNumber: newCase.caseNumber,
          status: 'NEW',
          nearestAmbulances: newCase.nearestAmbulances
        });
        setPhoneState('SEARCHING');
        setActiveAlert({
          id: newCase.caseId,
          caseNumber: newCase.caseNumber,
          pickupAddress: phoneLocation,
          pickupLatitude: lat,
          pickupLongitude: lng,
          status: 'NEW',
          callerName: phoneCaller,
          emergencyType: 'Critical Trauma Alert (Mobile SOS)'
        });
        setNearestAmbulances(newCase.nearestAmbulances || []);
        fetchRecentCases();
      }
    } catch (err) {
      console.error('SOS Trigger Error:', err);
      setPhoneState('IDLE');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 text-white p-6 rounded-3xl border border-red-900/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 flex-shrink-0 animate-pulse">
            <Radio className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-tight">SOS Mobile Dispatch Radar</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-ping">
                LIVE INTAKE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Phone-to-Control Room emergency link. Automatically identifies the <strong>3 nearest fleet units</strong> via road distance and broadcasts immediate dispatch alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/sos"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center space-x-2 shadow-lg shadow-red-600/20 transition-transform active:scale-95"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Mobile SOS on Phone (/sos)</span>
          </a>
        </div>
      </div>

      {/* Main 2-Column Grid: Left = Mobile Phone Simulator, Right = Control Room Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Mobile Phone Simulator (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-slate-300">Patient Smartphone App</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">iOS / Android PWA</span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-full max-w-[320px] rounded-[40px] border-4 border-slate-700 bg-slate-950 p-4 shadow-inner relative overflow-hidden text-center text-white flex flex-col justify-between min-h-[500px]">
            {/* Phone Notch */}
            <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-950 mr-2"></div>
              <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
            </div>

            {phoneState === 'IDLE' && (
              <div className="flex-1 flex flex-col justify-center items-center my-auto space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest">
                    AeroMed Instant SOS
                  </span>
                  <h3 className="text-xl font-black text-white">Emergency Dispatch</h3>
                  <p className="text-[11px] text-slate-400">Touch SOS button to transmit GPS to Control Room.</p>
                </div>

                {/* Big SOS Button */}
                <button
                  onClick={handleSimulatePhoneSos}
                  className="w-44 h-44 rounded-full bg-gradient-to-tr from-red-700 to-rose-500 text-white font-black text-4xl shadow-2xl shadow-red-600/50 border-4 border-red-400/40 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <span>SOS</span>
                  <span className="text-[9px] font-bold tracking-widest mt-1 opacity-80">TAP TO DISPATCH</span>
                </button>

                {/* Patient details */}
                <div className="w-full bg-slate-900/80 rounded-2xl p-3 border border-slate-800 text-left text-xs space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>Caller:</span>
                    <span className="font-bold text-white">{phoneCaller}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span>GPS Target:</span>
                    <span className="font-bold text-emerald-400 truncate max-w-[140px]">{phoneLocation}</span>
                  </div>
                </div>
              </div>
            )}

            {(phoneState === 'SEARCHING' || phoneState === 'DISPATCHING') && (
              <div className="flex-1 flex flex-col justify-center items-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                </div>
                <div>
                  <h4 className="font-black text-lg text-white">Alerting Control Room...</h4>
                  <p className="text-[11px] text-slate-400 mt-1">Analyzing distances to 3 closest ambulances.</p>
                </div>

                <div className="w-full bg-slate-900 rounded-2xl p-3 border border-slate-800 text-left text-xs space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Top 3 Nearest In Queue:</span>
                  {(phoneCase?.nearestAmbulances || nearestAmbulances).slice(0, 3).map((amb, i) => (
                    <div key={amb.id} className="flex justify-between text-[11px] p-1.5 rounded bg-slate-800/80">
                      <span className="font-bold text-slate-200">#{i + 1} {amb.registrationNumber}</span>
                      <span className="text-blue-400 font-bold">{amb.distanceKm} km</span>
                    </div>
                  ))}
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="w-2/5 h-full bg-red-500 animate-pulse"></div>
                </div>
              </div>
            )}

            {phoneState === 'TRACKING' && (
              <div className="flex-1 flex flex-col justify-center items-center space-y-4 my-auto">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                  <span className="text-3xl animate-bounce">🚑</span>
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black">
                    DISPATCH CONFIRMED
                  </span>
                  <h4 className="font-black text-xl text-white mt-1">Ambulance En Route!</h4>
                  <p className="text-[11px] text-slate-400">Sirens active. Paramedics proceeding to your location.</p>
                </div>

                <div className="w-full bg-gradient-to-r from-blue-950 to-slate-900 rounded-2xl p-3.5 border border-blue-500/30 text-left">
                  <span className="text-[9px] text-blue-400 uppercase font-bold">Lead Assigned Unit</span>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-xl font-black text-white">
                      {phoneCase?.assignedAmbulance?.registrationNumber || 'TN-01-EM-1001'}
                    </span>
                    <span className="text-base font-black text-emerald-400">
                      ~{phoneCase?.eta || '3 mins'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setPhoneState('IDLE')}
                  className="text-[11px] text-slate-400 hover:text-white underline pt-2"
                >
                  Reset Phone Simulation
                </button>
              </div>
            )}

            {/* Bottom Bar */}
            <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-3"></div>
          </div>
        </div>

        {/* RIGHT: Control Room Dispatch & 3-Ambulance Broadcast (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Case Card */}
          {activeAlert ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black flex-shrink-0">
                    <Flame className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-lg text-slate-900">{activeAlert.caseNumber}</span>
                      <StatusBadge status={activeAlert.status} />
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-xs font-bold">
                        P1 CRITICAL
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      📍 {activeAlert.pickupAddress || `GPS: ${activeAlert.pickupLatitude?.toFixed(4)}, ${activeAlert.pickupLongitude?.toFixed(4)}`}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400">Caller:</span>{' '}
                  <strong className="text-slate-800">{activeAlert.callerName}</strong>
                </div>
              </div>

              {/* 3 Nearest Ambulances Calculation Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                    <span>🚑 3 Nearest Ambulances (Calculated by Road Distance)</span>
                  </h3>
                  <span className="text-xs text-blue-600 font-bold">Automatic Distance Engine</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {nearestAmbulances.map((amb, index) => {
                    const isLead = index === 0;
                    return (
                      <div
                        key={amb.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isLead
                            ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full ${
                              isLead ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {index === 0 ? '🥇 1st Nearest' : index === 1 ? '🥈 2nd Nearest' : '🥉 3rd Nearest'}
                          </span>
                          <StatusBadge status={amb.status} />
                        </div>

                        <div className="mt-3">
                          <div className="font-black text-base text-slate-900">{amb.registrationNumber}</div>
                          <div className="text-xs text-slate-500 font-medium">{amb.ambulanceType} Grade</div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Distance</span>
                            <span className="text-sm font-black text-slate-900">{amb.distanceKm} km</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated ETA</span>
                            <span className="text-sm font-black text-emerald-600">~{amb.etaMins} mins</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Broadcast Action Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-base flex items-center space-x-2">
                      <Volume2 className="w-5 h-5 text-red-400 animate-pulse" />
                      <span>Control Room Multi-Unit Broadcast Dispatch</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Send the emergency message to the <strong>3 nearest ambulances</strong> simultaneously. Auto-assigns the lead unit.
                    </p>
                  </div>

                  <button
                    onClick={handleBroadcast}
                    disabled={isBroadcasting || activeAlert.status === 'DISPATCHED'}
                    className={`px-5 py-3 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                      activeAlert.status === 'DISPATCHED'
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/30 active:scale-95'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isBroadcasting
                        ? 'Broadcasting to 3 Units...'
                        : activeAlert.status === 'DISPATCHED'
                        ? '✓ Broadcast Complete & Unit Dispatched'
                        : '📢 Send Emergency Message to 3 Nearest Ambulances'}
                    </span>
                  </button>
                </div>

                {broadcastDone && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{broadcastMessage}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Radio className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No Inbound SOS Alerts in Active Queue</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tap the big red SOS button on the simulated phone on the left, or open <a href="/sos" target="_blank" className="text-blue-600 underline">/sos</a> on any mobile phone to test live patient intake.
              </p>
            </div>
          )}

          {/* Recent SOS Cases Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Recent Inbound SOS Emergency Alerts</h3>
              <button
                onClick={fetchRecentCases}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Case Number</th>
                    <th className="p-3">Caller</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Assigned Unit</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {recentSosCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => {
                        setActiveAlert(c);
                        fetchNearestForCase(c);
                      }}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        activeAlert?.id === c.id ? 'bg-blue-50/50 font-bold' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-900 font-mono font-bold">{c.caseNumber}</td>
                      <td className="p-3">{c.callerName}</td>
                      <td className="p-3 truncate max-w-xs">{c.pickupAddress}</td>
                      <td className="p-3">
                        {c.assignedAmbulance ? (
                          <span className="font-bold text-blue-600">{c.assignedAmbulance.registrationNumber}</span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAlert(c);
                            fetchNearestForCase(c);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px]"
                        >
                          Select ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
