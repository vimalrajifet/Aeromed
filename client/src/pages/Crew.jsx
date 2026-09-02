import React, { useState, useEffect } from 'react';
import { employeeApi } from '../api/endpoints';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import { Users, UserCheck, Shield, Phone, Plus, X, Award, Clock } from 'lucide-react';

export default function Crew() {
  const { showToast } = useNotifications();
  const { hasRole } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('DRIVER');
  const [phone, setPhone] = useState('+91 ');
  const [skills, setSkills] = useState('DEFENSIVE_DRIVING, CPR');
  const [shift, setShift] = useState('MORNING');

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await employeeApi.getAllEmployees({
        role: roleFilter,
        availability: availabilityFilter
      });
      setEmployees(res.data.data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [roleFilter, availabilityFilter]);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      await employeeApi.createEmployee({
        employeeCode: code,
        name,
        role,
        phone,
        skills,
        shift
      });
      showToast(`Employee ${name} registered in HCM roster`, 'success');
      setShowAddModal(false);
      setCode('');
      setName('');
      fetchEmployees();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to register employee', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Healthcare Staff & Crew Roster (SAP HCM)</h1>
            <p className="text-xs text-slate-500">
              Emergency medical technicians, doctors, paramedics, and certified emergency drivers
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {hasRole('ADMIN', 'OPERATOR') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
        >
          <option value="ALL">All Roles</option>
          <option value="DRIVER">Ambulance Drivers</option>
          <option value="PARAMEDIC">Paramedics</option>
          <option value="DOCTOR">Emergency Doctors</option>
          <option value="EMT">Emergency Medical Technicians (EMT)</option>
        </select>

        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className="text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
        >
          <option value="ALL">All Availabilities</option>
          <option value="AVAILABLE">Available</option>
          <option value="ASSIGNED">Assigned to Mission</option>
          <option value="OFF_DUTY">Off Duty</option>
          <option value="ON_LEAVE">On Leave</option>
        </select>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                  {emp.employeeCode}
                </span>
                <h3 className="font-extrabold text-base text-slate-900">{emp.name}</h3>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-bold rounded bg-slate-100 text-slate-700">
                  {emp.role}
                </span>
              </div>
              <StatusBadge status={emp.availabilityStatus} />
            </div>

            <div className="text-xs space-y-2 text-slate-600">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{emp.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Shift: <strong>{emp.shift}</strong></span>
              </div>
              <div className="flex items-start space-x-2 pt-1">
                <Award className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {emp.skills.split(',').map((skill, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold border border-purple-200">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Active Mission */}
            {emp.crewAssignments?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 text-xs bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                  Currently Assigned
                </span>
                <p className="font-bold text-slate-900 mt-0.5">
                  Case: {emp.crewAssignments[0].emergencyCase?.caseNumber}
                </p>
                <p className="text-slate-600 text-[11px]">
                  Vehicle: {emp.crewAssignments[0].ambulance?.registrationNumber}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Enroll New Medical / Dispatch Staff</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Employee Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-TN-401"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ramesh Sundaram"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Staff Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="DRIVER">Driver</option>
                    <option value="PARAMEDIC">Paramedic</option>
                    <option value="DOCTOR">Emergency Doctor</option>
                    <option value="EMT">EMT</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Shift Schedule *</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="MORNING">Morning (06:00 - 14:00)</option>
                    <option value="EVENING">Evening (14:00 - 22:00)</option>
                    <option value="NIGHT">Night (22:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Clinical Skills (Comma-separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  placeholder="CPR, ADVANCED_AIRWAY, DEFIBRILLATION"
                />
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
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow transition-all"
                >
                  Enroll Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
