import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Siren, Lock, User as UserIcon, ShieldAlert, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('operator');
  const [password, setPassword] = useState('aeromed123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { role: 'Administrator', user: 'admin', pass: 'admin123', desc: 'Full System & User Control', color: 'border-purple-200 hover:border-purple-500' },
    { role: 'Control-Room Operator', user: 'operator', pass: 'aeromed123', desc: 'Calls, Allocation & Dispatch', color: 'border-blue-200 hover:border-blue-500' },
    { role: 'Ambulance Driver', user: 'driver1', pass: 'aeromed123', desc: 'Driver Journey Portal & Steps', color: 'border-amber-200 hover:border-amber-500' },
    { role: 'Medical Team (Paramedic)', user: 'paramedic1', pass: 'aeromed123', desc: 'Clinical Care & Supplies', color: 'border-emerald-200 hover:border-emerald-500' },
    { role: 'Hospital Coordinator', user: 'hospital_coord', pass: 'aeromed123', desc: 'Inbound Pre-Alert & Bays', color: 'border-rose-200 hover:border-rose-500' },
    { role: 'Fleet Manager', user: 'fleet_mgr', pass: 'aeromed123', desc: 'Ambulances & PM Work Orders', color: 'border-indigo-200 hover:border-indigo-500' },
    { role: 'Inventory Manager', user: 'inventory_mgr', pass: 'aeromed123', desc: 'SAP MM Supplies & Stocks', color: 'border-teal-200 hover:border-teal-500' }
  ];

  const handleQuickSelect = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-xl shadow-red-900/50">
          <Siren className="w-9 h-9 animate-pulse" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">AeroMed</h1>
        <p className="text-sm font-medium text-slate-400">Emergency Fleet Management • SAP Architecture MVP</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white text-slate-900 py-8 px-6 shadow-2xl rounded-3xl border border-slate-100 sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-medium">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Username
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g. operator"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Selectors */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-center mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2">
                Click to Test a Role
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.user}
                  type="button"
                  onClick={() => handleQuickSelect(acc.user, acc.pass)}
                  className={`text-left p-2.5 rounded-xl border bg-slate-50/50 hover:bg-white transition-all text-xs ${acc.color}`}
                >
                  <div className="font-bold text-slate-900">{acc.role}</div>
                  <div className="text-[10px] text-slate-500">{acc.user} / {acc.pass}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Educational Demonstration Prototype • Fictional Medical & Telematics Data
        </div>
      </div>
    </div>
  );
}
