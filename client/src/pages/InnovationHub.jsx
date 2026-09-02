import React, { useState, useEffect } from 'react';
import { innovationApi, emergencyApi } from '../api/endpoints';
import offlineSyncService from '../services/offlineSyncService';
import {
  Sparkles,
  Activity,
  Building2,
  TrendingUp,
  MapPin,
  Wifi,
  WifiOff,
  PackageCheck,
  Sparkle,
  FileCheck,
  FileText,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Download,
  Check
} from 'lucide-react';

export default function InnovationHub({ setActiveTab }) {
  const [activeSubTab, setActiveSubTab] = useState('readiness');
  const [readinessFleet, setReadinessFleet] = useState([]);
  const [hospitalsRec, setHospitalsRec] = useState([]);
  const [demandForecast, setDemandForecast] = useState(null);
  const [standbyRecs, setStandbyRecs] = useState([]);
  const [redistributions, setRedistributions] = useState([]);
  const [sanitisationTasks, setSanitisationTasks] = useState([]);
  const [postReport, setPostReport] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [syncStatus, setSyncStatus] = useState({ isOnline: navigator.onLine, queueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Subscribe to offline sync status
  useEffect(() => {
    const unsub = offlineSyncService.subscribe((status) => {
      setSyncStatus(status);
    });
    setSyncStatus({ isOnline: navigator.onLine, queueCount: offlineSyncService.getQueue().length });
    return unsub;
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [readinessRes, forecastRes, standbyRes, redisRes, incRes, casesRes] = await Promise.all([
        innovationApi.getReadinessScores(),
        innovationApi.getDemandForecast(),
        innovationApi.getStandbyRecommendations(),
        innovationApi.getRedistributionRecommendations(),
        innovationApi.getIncidents(),
        emergencyApi.getCases({ limit: 10 })
      ]);

      setReadinessFleet(readinessRes.data.data || []);
      setDemandForecast(forecastRes.data.data || null);
      setStandbyRecs(standbyRes.data.data || []);
      setRedistributions(redisRes.data.data || []);
      setIncidents(incRes.data.data || []);
      const fetchedCases = casesRes.data.data.cases || [];
      setCases(fetchedCases);

      if (fetchedCases.length > 0) {
        const cId = fetchedCases[0].id;
        setSelectedCaseId(cId);
        loadCaseSpecificData(cId);
      }
    } catch (err) {
      console.error('Failed to load Innovation Hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCaseSpecificData = async (caseId) => {
    try {
      const [hospRes, repRes] = await Promise.all([
        innovationApi.getHospitalRecommendations(caseId),
        innovationApi.getPostEmergencyReport(caseId)
      ]);
      setHospitalsRec(hospRes.data.data || []);
      setPostReport(repRes.data.data || null);
    } catch (err) {
      console.warn('Case specific innovation query:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCaseChange = (caseId) => {
    setSelectedCaseId(caseId);
    loadCaseSpecificData(caseId);
  };

  const handleApproveStandby = async (id) => {
    try {
      await innovationApi.approveStandby(id);
      setActionSuccess('Ambulance repositioning to high-demand standby zone authorized!');
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
  };

  const handleApproveTransfer = async (rec) => {
    try {
      await innovationApi.approveInventoryTransfer(rec.id, {
        sourceAmbulanceId: rec.sourceAmbulanceId,
        destinationAmbulanceId: rec.destinationAmbulanceId,
        medicalItemId: rec.medicalItemId,
        quantity: rec.suggestedQuantity,
        reason: rec.reason
      });
      setActionSuccess('Medical item redistribution authorized and logged in stock ledger!');
      setTimeout(() => setActionSuccess(null), 4000);
      loadData();
    } catch (err) {
      alert('Transfer approval failed: ' + err.message);
    }
  };

  const handleTriggerOfflineQueue = () => {
    offlineSyncService.queueEvent('STATUS_UPDATE', {
      caseId: selectedCaseId,
      newStatus: 'AT_PICKUP',
      recordedOfflineAt: new Date().toISOString()
    });
    setActionSuccess('Operational status queued in local IndexedDB. Will auto-sync upon reconnection!');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleManualSync = async () => {
    const res = await offlineSyncService.syncNow();
    setActionSuccess(`Synchronized ${res.processedCount || 0} queued events to cloud database!`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleExportReportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Innovation Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Next-Generation Operational Architecture</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">AeroMed Innovation Centre</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            Autonomous decision intelligence: 6-factor fleet readiness scoring, predictive emergency demand modeling,
            multi-attribute hospital routing, offline data synchronisation, and multi-agency coordination.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-xs font-semibold flex items-center space-x-2">
            {syncStatus.isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Telemetry: Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-400" />
                <span>Telemetry: Offline ({syncStatus.queueCount} queued)</span>
              </>
            )}
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-lg shadow-blue-600/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Intelligence</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-200">
        {[
          { id: 'readiness', label: 'Ambulance Readiness', icon: Activity },
          { id: 'hospitals', label: 'Intelligent Hospital Ranking', icon: Building2 },
          { id: 'demand', label: 'Demand Forecasting & Standby', icon: TrendingUp },
          { id: 'sync', label: 'Offline Sync Engine', icon: Wifi },
          { id: 'redistribution', label: 'Medicine Redistribution', icon: PackageCheck },
          { id: 'sanitisation', label: 'Sanitisation Workflow', icon: Sparkle },
          { id: 'reports', label: 'Post-Emergency Intelligence', icon: FileText },
          { id: 'multi-agency', label: 'Multi-Agency Incidents', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: AMBULANCE READINESS INTELLIGENCE */}
      {activeSubTab === 'readiness' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Ambulance Readiness Intelligence Index</h2>
              <p className="text-xs text-slate-500">
                Weighted algorithmic scoring: Vehicle (25%), Medical Stock (25%), Fuel (15%), Crew (20%), Sanitisation (10%), GPS (5%).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readinessFleet.map((amb) => {
                const isReady = amb.category === 'READY';
                const isLimited = amb.category === 'LIMITED';
                const badgeColor = isReady
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isLimited
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <div key={amb.ambulanceId} className="p-5 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all space-y-3 bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">{amb.registrationNumber}</div>
                        <div className="text-[11px] font-semibold text-slate-400">{amb.ambulanceType} • Status: {amb.status}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${badgeColor}`}>
                        {amb.category} ({amb.overallScore}%)
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isReady ? 'bg-emerald-500' : isLimited ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${amb.overallScore}%` }}
                      />
                    </div>

                    {/* Factor Breakdown */}
                    <div className="space-y-1 pt-1 text-[11px]">
                      {amb.factors.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-600">
                          <span className="truncate">{f.factorName.replace('_', ' ')} ({(f.weight * 100).toFixed(0)}%)</span>
                          <span className="font-bold text-slate-800">{f.score}%</span>
                        </div>
                      ))}
                    </div>

                    {/* Missing Requirements or Corrective Action */}
                    <div className="pt-2 border-t border-slate-100 text-[11px]">
                      <div className="font-bold text-slate-700">Operational Assessment:</div>
                      <div className="text-slate-500 mt-0.5">{amb.reasonLowReadiness}</div>
                      <div className="mt-1 font-semibold text-blue-700">Recommendation: {amb.correctiveAction}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: INTELLIGENT HOSPITAL RECOMMENDATION */}
      {activeSubTab === 'hospitals' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Intelligent Hospital Recommendation Engine</h2>
                <p className="text-xs text-slate-500">
                  Multi-factor clinical allocation: Department Match (30%), Bed Availability (25%), ETA (25%), Workload (15%), Ack Speed (5%).
                </p>
              </div>

              {/* Case Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-600">Evaluate Incident:</span>
                <select
                  value={selectedCaseId}
                  onChange={(e) => handleCaseChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber} ({c.emergencyType} - {c.priority})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {hospitalsRec.map((h, idx) => (
                <div key={h.hospitalId} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-wider">
                      Rank #{idx + 1} Recommendation
                    </span>
                    <span className="text-base font-black text-slate-900">{h.recommendationScore}%</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{h.hospitalName}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{h.address}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-semibold">Estimated ETA</div>
                      <div className="font-bold text-slate-900">~{h.etaMins} mins ({h.distanceKm} km)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-semibold">Specialty Ward</div>
                      <div className="font-bold text-blue-700 truncate">{h.availableDepartment}</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-[11px] text-blue-900">
                    <div className="font-bold">Algorithmic Rationale:</div>
                    <div className="mt-0.5 leading-relaxed">{h.reasonForRecommendation}</div>
                  </div>

                  <div className="text-[10px] text-slate-400 italic">
                    {h.disclaimer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: DEMAND FORECASTING & STANDBY */}
      {activeSubTab === 'demand' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">Emergency Call Demand Forecasting & Dynamic Standby</h2>
              <p className="text-xs text-slate-500">
                Double Exponential Smoothing statistical forecasting evaluated against 7-day moving average baseline.
              </p>
            </div>

            {/* Baseline Metric Comparison Card */}
            {demandForecast?.baselineComparison && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Baseline MAE</div>
                  <div className="text-base font-black text-slate-800">{demandForecast.baselineComparison.baselineMAE}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Proposed Model MAE</div>
                  <div className="text-base font-black text-emerald-600">{demandForecast.baselineComparison.proposedModelMAE}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Mean Squared Error (MSE)</div>
                  <div className="text-base font-black text-slate-800">{demandForecast.baselineComparison.proposedModelMSE}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Accuracy Improvement</div>
                  <div className="text-base font-black text-blue-600">{demandForecast.baselineComparison.accuracyImprovementPct}</div>
                </div>
              </div>
            )}

            {/* Hourly Demand Visual Curve */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">24-Hour Call Volume Projections</h3>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                {demandForecast?.hourlyDemand?.map((h) => (
                  <div
                    key={h.hourNum}
                    className={`p-2 rounded-xl text-center border text-[10px] ${
                      h.isPeakHour
                        ? 'bg-red-50 text-red-800 border-red-200 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <div className="text-[9px] text-slate-400">{h.hour}</div>
                    <div className="text-sm font-black mt-0.5">{h.expectedCalls}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Standby Staging Recommendations */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Recommended Dynamic Standby Staging Locations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {standbyRecs.map((rec) => (
                  <div key={rec.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">🚑 {rec.registrationNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                        +{rec.estimatedCoverageIncreasePct} Coverage
                      </span>
                    </div>

                    <div className="text-xs">
                      <div className="font-bold text-slate-900">Target: {rec.targetZone}</div>
                      <p className="text-slate-500 text-[11px] mt-1">{rec.rationale}</p>
                    </div>

                    <button
                      onClick={() => handleApproveStandby(rec.id)}
                      disabled={rec.status === 'APPROVED'}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                        rec.status === 'APPROVED'
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
                      }`}
                    >
                      {rec.status === 'APPROVED' ? '✓ Repositioning Approved' : 'Authorize Standby Dispatch'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: OFFLINE DATA SYNCHRONISATION */}
      {activeSubTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Offline Emergency Data Synchronisation</h2>
                <p className="text-xs text-slate-500">
                  Idempotent IndexedDB client queue buffering status transitions and GPS telemetry during mobile network drops.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTriggerOfflineQueue}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Simulate Offline Event
                </button>
                <button
                  onClick={handleManualSync}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
                >
                  Trigger Sync ({syncStatus.queueCount})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold">Connection State</div>
                <div className="text-lg font-black text-slate-900 mt-1 flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{syncStatus.isOnline ? 'Online (Synchronized)' : 'Offline (Local Buffer)'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold">Local Unsent Queue</div>
                <div className="text-lg font-black text-blue-600 mt-1">{syncStatus.queueCount} Events Pending</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs text-slate-400 font-semibold">Duplicate Prevention</div>
                <div className="text-lg font-black text-emerald-600 mt-1">UUIDv4 Idempotency Active</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: MEDICINE EXPIRY & SMART REDISTRIBUTION */}
      {activeSubTab === 'redistribution' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Medicine Expiry & Cross-Fleet Redistribution</h2>
              <p className="text-xs text-slate-500">
                Rebalancing clinical inventory across ambulances prior to purchase orders.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redistributions.map((rec) => (
                <div key={rec.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Transfer ID: {rec.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                      Approval Required
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Source (Surplus)</div>
                      <div className="font-bold text-slate-800">{rec.sourceAmbulance}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Destination (Deficit)</div>
                      <div className="font-bold text-slate-800">{rec.destinationAmbulance}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">
                    <div>Item: <strong className="text-slate-900">{rec.medicalItemName}</strong></div>
                    <div>Quantity to Transfer: <strong className="text-blue-600">{rec.suggestedQuantity} units</strong></div>
                    <p className="text-[11px] text-slate-500 mt-1">{rec.reason}</p>
                  </div>

                  <button
                    onClick={() => handleApproveTransfer(rec)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    Approve Stock Transfer (Inventory Manager)
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: SANITISATION WORKFLOW */}
      {activeSubTab === 'sanitisation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Post-Handover Sanitisation & Decontamination Protocol</h2>
              <p className="text-xs text-slate-500">
                5-point antimicrobial checklist with supervisor sign-off before ambulance return to AVAILABLE status.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 max-w-xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">Ambulance: TN-01-EM-1001 (ALS)</span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                  DECONTAMINATION VERIFIED
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  'Stretcher & Mattress Antimicrobial Decontamination',
                  'Cabin Touchpoint & Surface Wipedown (Chlorine Dilution)',
                  'Airway Suction Tubing & Reusable Bag Valve Mask Sterilization',
                  'Biohazard Sharps Bin & Clinical Waste Bag Disposal',
                  'Personal Protective Equipment (PPE) Restocked'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Verified by: Station Supervisor Rajesh</span>
                <span>Ready for Allocation</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 7: POST-EMERGENCY INTELLIGENCE REPORT */}
      {activeSubTab === 'reports' && postReport && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Post-Emergency Intelligence Report: {postReport.caseNumber}</h2>
                <p className="text-xs text-slate-500">Non-punitive operational performance review</p>
              </div>

              <button
                onClick={handleExportReportPDF}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report (PDF)</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Dispatch Delay</div>
                <div className="text-lg font-black text-slate-900">{postReport.turnaroundMetrics.dispatchDelayMinutes}m</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Scene Travel Time</div>
                <div className="text-lg font-black text-slate-900">{postReport.turnaroundMetrics.pickupTravelMinutes}m</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Hospital Transit</div>
                <div className="text-lg font-black text-slate-900">{postReport.turnaroundMetrics.hospitalTravelMinutes}m</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Total Mission Time</div>
                <div className="text-lg font-black text-blue-600">{postReport.turnaroundMetrics.totalMissionTurnaroundMinutes}m</div>
              </div>
            </div>

            {/* Bottlenecks & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Identified Operational Bottlenecks</span>
                </div>
                <ul className="list-disc list-inside text-amber-800 space-y-1">
                  {postReport.operationalBottlenecks.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-900 flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Suggested Process Improvements</span>
                </div>
                <ul className="list-disc list-inside text-emerald-800 space-y-1">
                  {postReport.suggestedProcessImprovements.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 8: MULTI-AGENCY COORDINATION */}
      {activeSubTab === 'multi-agency' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Multi-Agency Emergency Coordination Command</h2>
              <p className="text-xs text-slate-500">
                Unified incident command coordinating Ambulance Services, Fire & Rescue, and Police.
              </p>
            </div>

            <div className="space-y-4">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 uppercase">
                        {inc.severity}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{inc.incidentNumber} - {inc.incidentType.replace('_', ' ')}</h3>
                      <p className="text-xs text-slate-500">{inc.locationAddress}</p>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-slate-400 font-semibold">Incident Commander</div>
                      <div className="font-bold text-slate-900">{inc.commanderName}</div>
                    </div>
                  </div>

                  {/* Agencies Responding */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {inc.agencies.map((agency) => (
                      <div key={agency.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="font-bold text-slate-800">{agency.agencyType.replace(/_/g, ' ')}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Lead: {agency.leadOfficer}</div>
                        <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                          <span className="text-blue-700">{agency.personnelCount} Personnel</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">{agency.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Assigned Resources */}
                  <div className="pt-2 border-t border-slate-100 text-xs flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-500">Resources Deployed:</span>
                    {inc.assignments.map((a) => (
                      <span key={a.id} className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 text-[11px]">
                        {a.resourceIdentifier}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
