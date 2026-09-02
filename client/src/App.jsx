import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Emergencies from './pages/Emergencies';
import CreateEmergency from './pages/CreateEmergency';
import LiveTracking from './pages/LiveTracking';
import DriverPortal from './pages/DriverPortal';
import HospitalPortal from './pages/HospitalPortal';
import Fleet from './pages/Fleet';
import Crew from './pages/Crew';
import Inventory from './pages/Inventory';
import Maintenance from './pages/Maintenance';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import SosConsole from './pages/SosConsole';
import InnovationHub from './pages/InnovationHub';
import Demo from './pages/Demo';
import AeroMedAssistant from './components/chat/AeroMedAssistant';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.role === 'DRIVER') {
        setActiveTab('driver-portal');
      } else if (user.role === 'HOSPITAL_COORD') {
        setActiveTab('hospital-portal');
      } else if (user.role === 'INVENTORY_MGR') {
        setActiveTab('inventory');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide">Starting AeroMed Operations Engine...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'sos-console':
        return <SosConsole onNavigateToTracking={() => setActiveTab('live-tracking')} />;
      case 'emergencies':
        return <Emergencies setActiveTab={setActiveTab} />;
      case 'create-emergency':
        return <CreateEmergency setActiveTab={setActiveTab} />;
      case 'live-tracking':
        return <LiveTracking />;
      case 'driver-portal':
        return <DriverPortal />;
      case 'hospital-portal':
        return <HospitalPortal />;
      case 'fleet':
        return <Fleet setActiveTab={setActiveTab} />;
      case 'crew':
        return <Crew />;
      case 'inventory':
        return <Inventory />;
      case 'maintenance':
        return <Maintenance />;
      case 'analytics':
        return <Analytics />;
      case 'innovation-hub':
        return <InnovationHub setActiveTab={setActiveTab} />;
      case 'demo':
      case 'vimal-command':
        return <Demo />;
      case 'users':
        return <Users />;
      case 'audit-logs':
        return <AuditLogs />;
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActivePage()}
        </main>
      </div>
      {/* Innovation 1: Floating AeroMed AI Assistant */}
      <AeroMedAssistant />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}
