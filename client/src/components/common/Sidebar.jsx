import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  AlertCircle,
  Truck,
  Users,
  Radio,
  MapPin,
  Building2,
  Package,
  Wrench,
  BarChart3,
  FileText,
  UserCheck,
  Send,
  Navigation
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { user, hasRole, login } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Control Room',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'OPERATOR', 'FLEET_MGR', 'HOSPITAL_COORD']
    },
    {
      id: 'sos-console',
      label: '🚨 SOS Dispatch Radar',
      icon: Radio,
      roles: ['ADMIN', 'OPERATOR']
    },
    {
      id: 'emergencies',
      label: 'Emergency Cases',
      icon: AlertCircle,
      roles: ['ADMIN', 'OPERATOR', 'DRIVER', 'MEDICAL_TEAM', 'HOSPITAL_COORD']
    },
    {
      id: 'create-emergency',
      label: 'New Emergency Call',
      icon: Send,
      roles: ['ADMIN', 'OPERATOR']
    },
    {
      id: 'live-tracking',
      label: 'Live Telematics Map',
      icon: MapPin,
      roles: ['ADMIN', 'OPERATOR', 'DRIVER', 'FLEET_MGR', 'HOSPITAL_COORD']
    },
    {
      id: 'driver-portal',
      label: 'Driver Journey Portal',
      icon: Navigation,
      roles: ['ADMIN', 'DRIVER']
    },
    {
      id: 'hospital-portal',
      label: 'Hospital Pre-Alerts',
      icon: Building2,
      roles: ['ADMIN', 'HOSPITAL_COORD', 'OPERATOR']
    },
    {
      id: 'fleet',
      label: 'Ambulance Fleet',
      icon: Truck,
      roles: ['ADMIN', 'OPERATOR', 'FLEET_MGR']
    },
    {
      id: 'crew',
      label: 'Staff & Medical Crew',
      icon: Users,
      roles: ['ADMIN', 'OPERATOR', 'FLEET_MGR']
    },
    {
      id: 'inventory',
      label: 'Medical Inventory (MM)',
      icon: Package,
      roles: ['ADMIN', 'INVENTORY_MGR', 'FLEET_MGR', 'MEDICAL_TEAM']
    },
    {
      id: 'maintenance',
      label: 'Fleet Maintenance (PM)',
      icon: Wrench,
      roles: ['ADMIN', 'FLEET_MGR', 'DRIVER']
    },
    {
      id: 'analytics',
      label: 'Operations Analytics',
      icon: BarChart3,
      roles: ['ADMIN', 'OPERATOR', 'FLEET_MGR', 'INVENTORY_MGR']
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCheck,
      roles: ['ADMIN']
    },
    {
      id: 'audit-logs',
      label: 'GRC Audit Trail',
      icon: FileText,
      roles: ['ADMIN', 'OPERATOR', 'FLEET_MGR']
    }
  ];

  const visibleItems = navItems.filter((item) => hasRole(...item.roles));

  // Demo Fast Role Switcher
  const demoRoles = [
    { label: 'Admin', username: 'admin', pass: 'admin123', color: 'bg-purple-600' },
    { label: 'Operator', username: 'operator', pass: 'aeromed123', color: 'bg-blue-600' },
    { label: 'Driver', username: 'driver1', pass: 'aeromed123', color: 'bg-amber-600' },
    { label: 'Medic', username: 'paramedic1', pass: 'aeromed123', color: 'bg-emerald-600' },
    { label: 'Hospital', username: 'hospital_coord', pass: 'aeromed123', color: 'bg-rose-600' },
    { label: 'Fleet', username: 'fleet_mgr', pass: 'aeromed123', color: 'bg-indigo-600' },
    { label: 'Inventory', username: 'inventory_mgr', pass: 'aeromed123', color: 'bg-teal-600' }
  ];

  const handleQuickSwitch = async (role) => {
    try {
      await login(role.username, role.pass);
      setActiveTab(role.username === 'driver1' ? 'driver-portal' : role.username === 'hospital_coord' ? 'hospital-portal' : 'dashboard');
    } catch (err) {
      console.error('Quick switch error:', err);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Demo Fast Role Switcher Box */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Demo Role Switcher
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {demoRoles.map((r) => {
              const isCurrent = user?.role === r.label.toUpperCase() || (r.label === 'Medic' && user?.role === 'MEDICAL_TEAM');
              return (
                <button
                  key={r.username}
                  onClick={() => handleQuickSwitch(r)}
                  className={`text-[10px] font-semibold py-1 rounded transition-all truncate px-1 text-center ${
                    isCurrent
                      ? `${r.color} text-white ring-2 ring-white/50 shadow`
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={`Switch to ${r.label} (${r.username})`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
