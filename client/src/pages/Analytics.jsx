import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../api/endpoints';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { BarChart3, Clock, AlertCircle, Package, Truck, Building2, RefreshCw } from 'lucide-react';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#06b6d4'];
const FLEET_COLORS = {
  Available: '#16a34a',
  'On Trip / Assigned': '#dc2626',
  Maintenance: '#d97706',
  Offline: '#64748b'
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getDashboardAnalytics();
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const overview = data?.overview || {};
  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const lowStock = data?.lowStockItems || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Operations & Fleet Performance Analytics</h1>
            <p className="text-xs text-slate-500">
              Aggregated directly from database records • No hardcoded metrics
            </p>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Avg Dispatch Speed</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpis.avgDispatchTimeMins ?? 0} <span className="text-xs font-semibold text-slate-500">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">Call receipt to vehicle release</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Avg Response Speed</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpis.avgResponseTimeMins ?? 0} <span className="text-xs font-semibold text-slate-500">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">Dispatch to scene arrival</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Hospital Turnaround</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpis.avgHospitalTurnaroundMins ?? 0} <span className="text-xs font-semibold text-slate-500">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">Arrival to handover completion</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-medium">
            <Building2 className="w-4 h-4 text-rose-600" />
            <span>Hospital Ack Time</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {kpis.avgHospitalAckMins ?? 0} <span className="text-xs font-semibold text-slate-500">mins</span>
          </div>
          <p className="text-[11px] text-slate-400">Pre-alert acknowledgment delay</p>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Emergency Type (BarChart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Emergency Calls by Category</h3>
            <p className="text-xs text-slate-400">Total cases classified across categories</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.casesByType || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    color: 'white',
                    fontSize: '12px',
                    border: 'none'
                  }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status Distribution (PieChart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Fleet Status Breakdown</h3>
            <p className="text-xs text-slate-400">Ambulance readiness and deployment</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.fleetStatus || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {(charts.fleetStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={FLEET_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequently Used Medical Supplies (BarChart) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Frequently Consumed Supplies (SAP MM)</h3>
            <p className="text-xs text-slate-400">Top items deducted from ambulance stocks</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.frequentlyUsedItems || []} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#0d9488" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Warning List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Low-Stock Watchlist (Below Safety Threshold)</h3>
              <p className="text-xs text-slate-400">Items requiring warehouse replenishment</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
              {lowStock.length} Alert{lowStock.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
            {lowStock.length === 0 ? (
              <div className="p-6 text-center text-slate-400">All ambulance stocks are above minimum safety thresholds</div>
            ) : (
              lowStock.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{item.item}</span>
                    <div className="text-[10px] text-slate-400">Vehicle: {item.ambulance}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-red-600">
                      {item.available} / {item.minimum} {item.unit}s
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
