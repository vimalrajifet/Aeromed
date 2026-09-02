import React, { useState, useEffect } from 'react';
import { analyticsApi, emergencyApi, ambulanceApi, hospitalApi } from '../api/endpoints';
import LiveMap from '../components/map/LiveMap';
import StatusBadge from '../components/common/StatusBadge';
import {
  AlertCircle,
  Truck,
  Navigation,
  Wrench,
  Building2,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
  Siren,
  Radio,
  MapPin,
  ChevronRight
} from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [analytics, setAnalytics] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, casesRes, ambRes, hospRes] = await Promise.all([
        analyticsApi.getDashboardAnalytics(),
        emergencyApi.getCases({ limit: 20 }),
        ambulanceApi.getAllAmbulances(),
        hospitalApi.getHospitals()
      ]);

      setAnalytics(analyticsRes.data.data);
      setRecentCases(casesRes.data.data.cases);
      setAmbulances(ambRes.data.data);
      setHospitals(hospRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh telematics map and stats periodically every 8s
    const timer = setInterval(fetchData, 8000);
    return () => clearInterval(timer);
  }, []);

  const overview = analytics?.overview || {};
  const kpis = analytics?.kpis || {};
  const activeCases = recentCases.filter(
    (c) => c.status !== 'RESOLVED' && c.status !== 'CANCELLED'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Control-Room Command Center</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time emergency monitoring, rule-based vehicle allocation, and Chennai telematics.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center space-x-2 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => setActiveTab('create-emergency')}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Emergency Call</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Open Emergencies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Open Emergencies</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{overview.openCases ?? 0}</div>
          <p className="text-[11px] text-slate-400">Cases awaiting or in allocation</p>
        </div>

        {/* Available Ambulances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Available Fleet</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600">{overview.availableAmbulances ?? 0}</div>
          <p className="text-[11px] text-slate-400">Ready for immediate dispatch</p>
        </div>

        {/* Active Trips */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Active Trips</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Navigation className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-blue-600">{overview.activeTrips ?? 0}</div>
          <p className="text-[11px] text-slate-400">En route to pickup/hospital</p>
        </div>

        {/* Maintenance Vehicles */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">In Maintenance</span>
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Wrench className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-orange-600">{overview.maintenanceAmbulances ?? 0}</div>
          <p className="text-[11px] text-slate-400">Excluded from allocation</p>
        </div>

        {/* Pending Pre-Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Hospital Alerts</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Building2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600">{overview.pendingAlerts ?? 0}</div>
          <p className="text-[11px] text-slate-400">Awaiting acknowledgment</p>
        </div>
      </div>

      {/* Main Grid: Live Fleet Telematics & Recent Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live GPS Telematics Map (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Ambulance Telematics Map</h2>
              <p className="text-xs text-slate-500">GPS simulator emitting 5-second updates across Chennai corridors</p>
            </div>
            <button
              onClick={() => setActiveTab('live-tracking')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Full Screen</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <LiveMap
            ambulances={ambulances}
            hospitals={hospitals}
            selectedCase={recentCases[0] || null}
            selectedAmbulance={ambulances.find((a) => a.status === 'ON_TRIP') || ambulances[0] || null}
            height="380px"
          />

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
              <span>On Active Trip</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Maintenance Order Active</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Receiving Hospital</span>
            </div>
          </div>
        </div>

        {/* Active Emergencies & Create Emergency Terminal (Control Room Dark Aesthetic) */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-5 text-white flex flex-col justify-between">
          <div>
            {/* Header with Live Pulse */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                  <Siren className="w-4 h-4 animate-pulse" />
                </span>
                <div>
                  <h2 className="text-base font-black text-white tracking-tight">
                    Active Emergencies
                  </h2>
                  <p className="text-[11px] text-slate-400">Live mission queue & triage dispatch</p>
                </div>
              </div>
              <span className="px-2.5 py-1 text-xs font-black rounded-full bg-red-500/20 text-red-300 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.25)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>{activeCases.length} ACTIVE</span>
              </span>
            </div>

            {/* Quick Action: Create Emergency Button */}
            <div className="mt-4">
              <button
                onClick={() => setActiveTab('create-emergency')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-lg bg-white/20">
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="text-sm">Create Emergency</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-black/25 text-white/90">
                  New Call ➔
                </span>
              </button>
            </div>

            {/* Active Emergencies List */}
            <div className="mt-4 space-y-2.5 max-h-[290px] overflow-y-auto pr-1 scrollbar-thin">
              {activeCases.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-800/40 border border-slate-800 text-center space-y-2">
                  <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <div className="text-xs font-bold text-slate-300">No Pending Emergency Calls</div>
                  <p className="text-[11px] text-slate-500">All emergency missions resolved. Fleet on standby.</p>
                </div>
              ) : (
                activeCases.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setActiveTab('emergencies')}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 transition-all cursor-pointer group space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-black text-white group-hover:text-blue-400 transition-colors">
                          {c.caseNumber}
                        </span>
                        <StatusBadge status={c.priority} />
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <div className="flex items-start space-x-2 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="truncate text-[11px] text-slate-300" title={c.pickupAddress}>
                        {c.pickupAddress}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-700/40">
                      <div className="text-slate-400">
                        {c.assignedAmbulance ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            🚑 {c.assignedAmbulance.registrationNumber} ({c.assignedAmbulance.ambulanceType})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                            ⚠️ Pending Allocation
                          </span>
                        )}
                      </div>
                      <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center text-[10px] font-bold">
                        Dispatch ➔
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Portals Strip in sleek dark style */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab('driver-portal')}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-amber-300 group-hover:text-amber-200 flex items-center justify-between">
                <span>Driver Portal</span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </div>
              <div className="text-[10px] text-slate-400">Mission steps</div>
            </button>
            <button
              onClick={() => setActiveTab('hospital-portal')}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-all group"
            >
              <div className="text-[11px] font-bold text-rose-300 group-hover:text-rose-200 flex items-center justify-between">
                <span>Hospital Portal</span>
                <ChevronRight className="w-3 h-3 opacity-60" />
              </div>
              <div className="text-[10px] text-slate-400">Bay alerts</div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Emergency Calls Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Emergency Incidents</h2>
            <p className="text-xs text-slate-500">Live operational case log</p>
          </div>
          <button
            onClick={() => setActiveTab('emergencies')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All Cases</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Case #</th>
                <th className="px-5 py-3.5">Category & Priority</th>
                <th className="px-5 py-3.5">Pickup Location</th>
                <th className="px-5 py-3.5">Assigned Fleet</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{c.caseNumber}</td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800">{c.emergencyType}</div>
                    <div className="mt-0.5">
                      <StatusBadge status={c.priority} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 max-w-xs truncate text-slate-600" title={c.pickupAddress}>
                    {c.pickupAddress}
                  </td>
                  <td className="px-5 py-3.5">
                    {c.assignedAmbulance ? (
                      <span className="font-semibold text-slate-800">
                        🚑 {c.assignedAmbulance.registrationNumber} ({c.assignedAmbulance.ambulanceType})
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium italic">Pending Allocation</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setActiveTab('emergencies')}
                      className="px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-700 font-semibold transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
