import React, { useState, useEffect } from 'react';
import { ambulanceApi } from '../api/endpoints';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { Truck, Fuel, Gauge, Calendar, Plus, Wrench, X } from 'lucide-react';

export default function Fleet({ setActiveTab }) {
  const { showToast } = useNotifications();
  const { hasRole } = useAuth();
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Ambulance Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [regNum, setRegNum] = useState('');
  const [ambType, setAmbType] = useState('ALS');
  const [fuel, setFuel] = useState(90);
  const [odometer, setOdometer] = useState(15000);

  const fetchFleet = async () => {
    try {
      setLoading(true);
      const res = await ambulanceApi.getAllAmbulances();
      setAmbulances(res.data.data);
    } catch (err) {
      console.error('Failed to load fleet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const handleCreateAmbulance = async (e) => {
    e.preventDefault();
    try {
      await ambulanceApi.createAmbulance({
        registrationNumber: regNum,
        ambulanceType: ambType,
        fuelLevel: parseFloat(fuel),
        odometerReading: parseFloat(odometer)
      });
      showToast(`Ambulance ${regNum} added to fleet roster`, 'success');
      setShowAddModal(false);
      setRegNum('');
      fetchFleet();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add ambulance', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Emergency Ambulance Fleet Roster</h1>
            <p className="text-xs text-slate-500">
              Vehicle readiness, maintenance status, and onboard equipment grading
            </p>
          </div>
        </div>

        {hasRole('ADMIN', 'FLEET_MGR') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Vehicle</span>
          </button>
        )}
      </div>

      {/* Fleet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ambulances.map((amb) => (
          <div
            key={amb.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                  {amb.ambulanceType} Grade
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">{amb.registrationNumber}</h3>
              </div>
              <StatusBadge status={amb.status} />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                <Fuel className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Fuel Tank</span>
                  <span className="font-bold text-slate-900">{amb.fuelLevel}%</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Odometer</span>
                  <span className="font-bold text-slate-900">{amb.odometerReading} km</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
              <div className="flex justify-between">
                <span>Last Service:</span>
                <span className="font-medium text-slate-800">
                  {amb.lastServiceDate ? new Date(amb.lastServiceDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Next Routine Service:</span>
                <span className="font-medium text-slate-800">
                  {amb.nextServiceDate ? new Date(amb.nextServiceDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Active Crew & Assignments */}
            {amb.crewAssignments?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Crew
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {amb.crewAssignments.map((a) => (
                    <span key={a.id} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {a.employee.name} ({a.employee.role})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Ambulance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Register New Fleet Ambulance</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAmbulance} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TN-04-EM-4001"
                  value={regNum}
                  onChange={(e) => setRegNum(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ambulance Grade *</label>
                <select
                  value={ambType}
                  onChange={(e) => setAmbType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="ALS">ALS (Advanced Life Support)</option>
                  <option value="BLS">BLS (Basic Life Support)</option>
                  <option value="PATIENT_TRANSPORT">Patient Transport Vehicle (PTS)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fuel Level (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={fuel}
                    onChange={(e) => setFuel(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
