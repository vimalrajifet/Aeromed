import React, { useState, useEffect } from 'react';
import { emergencyApi, hospitalApi } from '../api/endpoints';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Search,
  Filter,
  Eye,
  Send,
  X,
  Clock,
  MapPin,
  Phone,
  Building2,
  Package,
  Activity,
  CheckCircle,
  Truck
} from 'lucide-react';

export default function Emergencies({ setActiveTab }) {
  const { showToast } = useNotifications();
  const { hasRole } = useAuth();
  const [cases, setCases] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Case Details Modal
  const [selectedCase, setSelectedCase] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Pre-Alert Trigger Modal inside inspection
  const [showPreAlertModal, setShowPreAlertModal] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [targetHospitalId, setTargetHospitalId] = useState('');
  const [preAlertDept, setPreAlertDept] = useState('CARDIOLOGY');
  const [preAlertNotes, setPreAlertNotes] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await emergencyApi.getCases({
        status: statusFilter,
        priority: priorityFilter,
        search
      });
      setCases(res.data.data.cases);
    } catch (err) {
      console.error('Failed to load emergency cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    hospitalApi.getHospitals().then((res) => {
      setHospitals(res.data.data);
      if (res.data.data.length > 0) setTargetHospitalId(res.data.data[0].id);
    });
  }, []);

  const openDetails = async (caseId) => {
    try {
      setModalLoading(true);
      const res = await emergencyApi.getCaseById(caseId);
      setSelectedCase(res.data.data);
    } catch (err) {
      showToast('Failed to load case details', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendPreAlert = async () => {
    if (!selectedCase || !targetHospitalId) return;
    try {
      await hospitalApi.createAlert({
        emergencyCaseId: selectedCase.id,
        hospitalId: targetHospitalId,
        emergencyCategory: selectedCase.emergencyType,
        requiredDepartment: preAlertDept,
        estimatedArrivalTime: new Date(Date.now() + 15 * 60000).toISOString(),
        notes: preAlertNotes || 'Prepare trauma bay for immediate reception'
      });
      showToast('Hospital Pre-Alert transmitted to trauma center!', 'success');
      setShowPreAlertModal(false);
      openDetails(selectedCase.id);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send pre-alert', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Emergency Incident Management</h1>
          <p className="text-xs text-slate-500">
            Lifecycle monitoring, crew assignment, and clinical audit trail
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search case #, address, caller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="EN_ROUTE_TO_PICKUP">EN_ROUTE_TO_PICKUP</option>
            <option value="AT_PICKUP">AT_PICKUP</option>
            <option value="EN_ROUTE_TO_HOSPITAL">EN_ROUTE_TO_HOSPITAL</option>
            <option value="ARRIVED_AT_HOSPITAL">ARRIVED_AT_HOSPITAL</option>
            <option value="HANDED_OVER">HANDED_OVER</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
          >
            <option value="ALL">All Priorities</option>
            <option value="P1_CRITICAL">P1 Critical</option>
            <option value="P2_HIGH">P2 High</option>
            <option value="P3_MEDIUM">P3 Medium</option>
            <option value="P4_LOW">P4 Low</option>
          </select>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Case #</th>
                <th className="px-5 py-3.5">Type & Priority</th>
                <th className="px-5 py-3.5">Caller Info</th>
                <th className="px-5 py-3.5">Pickup Location</th>
                <th className="px-5 py-3.5">Assigned Ambulance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">Loading cases...</td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">No emergency cases match filters</td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{c.caseNumber}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{c.emergencyType}</div>
                      <div className="mt-0.5">
                        <StatusBadge status={c.priority} />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{c.callerName}</div>
                      <div className="text-[10px] text-slate-400">{c.callerPhone}</div>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate text-slate-600" title={c.pickupAddress}>
                      {c.pickupAddress}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.assignedAmbulance ? (
                        <span className="font-semibold text-slate-800">
                          🚑 {c.assignedAmbulance.registrationNumber}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Pending Allocation</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => openDetails(c.id)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold inline-flex items-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold">Case Record: {selectedCase.caseNumber}</h3>
                  <StatusBadge status={selectedCase.status} />
                  <StatusBadge status={selectedCase.priority} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Registered: {new Date(selectedCase.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Lifecycle Progression Timeline */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Mission Lifecycle Timeline</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold block">CALL RECEIVED</span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedCase.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold block">DISPATCHED</span>
                    <span className="font-bold text-slate-800">
                      {selectedCase.dispatchedAt ? new Date(selectedCase.dispatchedAt).toLocaleTimeString() : 'Pending'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold block">ARRIVED SCENE</span>
                    <span className="font-bold text-slate-800">
                      {selectedCase.arrivedAt ? new Date(selectedCase.arrivedAt).toLocaleTimeString() : 'In Transit'}
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-semibold block">MISSION CLOSED</span>
                    <span className="font-bold text-slate-800">
                      {selectedCase.completedAt ? new Date(selectedCase.completedAt).toLocaleTimeString() : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location & Caller Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span>Location Details</span>
                  </h4>
                  <p className="text-sm font-semibold text-slate-800">{selectedCase.pickupAddress}</p>
                  <p className="text-xs text-slate-500">
                    Coordinates: {selectedCase.pickupLatitude.toFixed(4)}, {selectedCase.pickupLongitude.toFixed(4)}
                  </p>
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <strong>Destination Hospital:</strong> {selectedCase.destinationHospital?.name || 'Not Designated'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>Caller & Clinical Notes</span>
                  </h4>
                  <p className="text-sm font-semibold text-slate-800">{selectedCase.callerName} ({selectedCase.callerPhone})</p>
                  <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{selectedCase.description || 'No additional notes provided'}"
                  </p>
                </div>
              </div>

              {/* Assigned Resources */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Assigned Vehicle & Crew</span>
                </h4>
                {selectedCase.assignedAmbulance ? (
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 font-bold">
                      🚑 {selectedCase.assignedAmbulance.registrationNumber} ({selectedCase.assignedAmbulance.ambulanceType})
                    </div>
                    {selectedCase.crewAssignments?.map((assign) => (
                      <div key={assign.id} className="p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">{assign.roleInCase}</span>
                        <span className="font-semibold">{assign.employee.name}</span> ({assign.employee.phone})
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 font-medium italic">No ambulance assigned yet.</div>
                )}
              </div>

              {/* Hospital Pre-Alert Section */}
              <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-rose-600" />
                    <span>Hospital Pre-Alerts (Trauma Bay Readiness)</span>
                  </h4>
                  {hasRole('OPERATOR', 'ADMIN') && selectedCase.status !== 'CLOSED' && (
                    <button
                      onClick={() => setShowPreAlertModal(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1 rounded-lg"
                    >
                      + Send Pre-Alert
                    </button>
                  )}
                </div>

                {selectedCase.hospitalAlerts?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedCase.hospitalAlerts.map((alt) => (
                      <div key={alt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{alt.hospital.name}</div>
                          <div className="text-slate-500">Dept: {alt.requiredDepartment} • Category: {alt.emergencyCategory}</div>
                          {alt.notes && <div className="text-[11px] text-slate-600 mt-1 italic">{alt.notes}</div>}
                        </div>
                        <div className="text-right">
                          <StatusBadge status={alt.status} />
                          <div className="text-[10px] text-slate-400 mt-1">
                            Sent: {new Date(alt.sentAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No pre-alert transmitted for this case yet.</p>
                )}
              </div>

              {/* Consumed Supplies (SAP MM) */}
              {selectedCase.inventoryTransactions?.length > 0 && (
                <div className="p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                    <Package className="w-4 h-4 text-teal-600" />
                    <span>Medical Supplies Consumed (SAP MM Ledger)</span>
                  </h4>
                  <div className="divide-y divide-slate-100 text-xs">
                    {selectedCase.inventoryTransactions.map((tx) => (
                      <div key={tx.id} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-800">{tx.medicalItem.name}</span>
                          <span className="text-slate-400 ml-2">by {tx.performedBy}</span>
                        </div>
                        <span className="font-extrabold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                          - {tx.quantity} {tx.medicalItem.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pre-Alert Creation Sub-Modal */}
      {showPreAlertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Transmit Emergency Pre-Alert</h3>
              <button onClick={() => setShowPreAlertModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receiving Hospital</label>
                <select
                  value={targetHospitalId}
                  onChange={(e) => setTargetHospitalId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Required Department</label>
                <select
                  value={preAlertDept}
                  onChange={(e) => setPreAlertDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="CARDIOLOGY">Cardiology / Catheterization Lab</option>
                  <option value="TRAUMA_CARE">Trauma Care Bay (Red Code)</option>
                  <option value="NEUROLOGY">Neurology / Acute Stroke Team</option>
                  <option value="ICU">Intensive Care Unit (Ventilator)</option>
                  <option value="BURNS">Burns Specialty Unit</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Trauma Readiness Notes</label>
                <textarea
                  rows={3}
                  value={preAlertNotes}
                  onChange={(e) => setPreAlertNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  placeholder="Patient vital signs, intubation status, blood crossmatch requirements..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setShowPreAlertModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPreAlert}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30"
              >
                Broadcast Pre-Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
