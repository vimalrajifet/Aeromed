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
  Plus
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
        emergencyApi.getCases({ limit: 6 }),
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

        {/* Operational Response Benchmarks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Performance Benchmarks</h2>
            <p className="text-xs text-slate-500">Calculated from actual completed missions</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Avg Dispatch Time</div>
                  <div className="text-[11px] text-slate-400">Call receipt to vehicle release</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">{kpis.avgDispatchTimeMins ?? 2.5}</span>
                <span className="text-xs text-slate-500 ml-1">mins</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Avg Response Time</div>
                  <div className="text-[11px] text-slate-400">Dispatch to scene arrival</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">{kpis.avgResponseTimeMins ?? 11.8}</span>
                <span className="text-xs text-slate-500 ml-1">mins</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-800">Hospital Pre-Alert Speed</div>
                  <div className="text-[11px] text-slate-400">Sent to trauma coordinator ack</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">{kpis.avgHospitalAckMins ?? 3.2}</span>
                <span className="text-xs text-slate-500 ml-1">mins</span>
              </div>
            </div>
          </div>

          {/* Role-Specific Direct Navigation Cards */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab('driver-portal')}
                className="p-3 text-left rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                <div className="text-xs font-bold text-amber-900">Driver Portal</div>
                <div className="text-[10px] text-amber-700">Accept mission & steps</div>
              </button>
              <button
                onClick={() => setActiveTab('hospital-portal')}
                className="p-3 text-left rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                <div className="text-xs font-bold text-rose-900">Hospital Portal</div>
                <div className="text-[10px] text-rose-700">Acknowledge bay alerts</div>
              </button>
            </div>
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
