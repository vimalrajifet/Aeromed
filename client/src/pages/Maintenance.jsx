import React, { useState, useEffect } from 'react';
import { maintenanceApi, ambulanceApi } from '../api/endpoints';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  X,
  FileCheck,
  Truck
} from 'lucide-react';

export default function Maintenance() {
  const { showToast } = useNotifications();
  const { hasRole } = useAuth();
  const [orders, setOrders] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Work Order Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('SCHEDULED_SERVICE');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [performedBy, setPerformedBy] = useState('TVS Mobility Services');

  // Complete Order Modal
  const [completeModalOrder, setCompleteModalOrder] = useState(null);
  const [technicianNotes, setTechnicianNotes] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orderRes, ambRes] = await Promise.all([
        maintenanceApi.getOrders(),
        ambulanceApi.getAllAmbulances()
      ]);
      setOrders(orderRes.data.data);
      setAmbulances(ambRes.data.data);
      if (ambRes.data.data.length > 0) {
        setSelectedAmbulanceId(ambRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load maintenance orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    try {
      await maintenanceApi.createOrder({
        ambulanceId: selectedAmbulanceId,
        maintenanceType,
        issueDescription,
        priority,
        performedBy
      });
      showToast('Maintenance work order generated! Vehicle locked in MAINTENANCE status.', 'success');
      setShowCreateModal(false);
      setIssueDescription('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate work order', 'error');
    }
  };

  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!completeModalOrder) return;
    try {
      await maintenanceApi.updateOrder(completeModalOrder.id, {
        status: 'COMPLETED',
        technicianNotes: technicianNotes || 'All checklist items verified. Vehicle restored to service.'
      });
      showToast('Work order closed! Vehicle certified fit and returned to AVAILABLE status.', 'success');
      setCompleteModalOrder(null);
      setTechnicianNotes('');
      fetchData();
    } catch (err) {
      showToast('Failed to complete order', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Fleet Plant Maintenance (SAP PM)</h1>
            <p className="text-xs text-slate-500">
              Work order lifecycle, breakdown repairs, safety inspections, and vehicle downtime locking
            </p>
          </div>
        </div>

        {hasRole('ADMIN', 'FLEET_MGR', 'DRIVER') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Work Order</span>
          </button>
        )}
      </div>

      {/* Warning Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center space-x-3 text-xs text-amber-900">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p>
          <strong>Automatic Allocation Lockout:</strong> Any ambulance with an active maintenance order is immediately placed in <code>MAINTENANCE</code> status. The allocation engine will strictly exclude it from dispatch until marked <code>COMPLETED</code>.
        </p>
      </div>

      {/* Work Orders List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-5 py-3.5">Vehicle</th>
                <th className="px-5 py-3.5">Type & Priority</th>
                <th className="px-5 py-3.5">Issue Description</th>
                <th className="px-5 py-3.5">Service Center</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Scheduled</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{ord.orderNumber}</td>
                  <td className="px-5 py-3.5 font-extrabold text-slate-800">
                    🚑 {ord.ambulance.registrationNumber}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-slate-800">{ord.maintenanceType}</span>
                    <div className="mt-0.5">
                      <StatusBadge status={ord.priority} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5 max-w-xs truncate text-slate-600" title={ord.issueDescription}>
                    {ord.issueDescription}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{ord.performedBy}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={ord.status} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(ord.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {ord.status !== 'COMPLETED' && hasRole('ADMIN', 'FLEET_MGR') ? (
                      <button
                        onClick={() => {
                          setCompleteModalOrder(ord);
                          setTechnicianNotes('');
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition-colors inline-flex items-center space-x-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Sign Off Order</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium italic">Verified & Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900">Create Maintenance Work Order</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Fleet Vehicle *</label>
                <select
                  value={selectedAmbulanceId}
                  onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  {ambulances.map((a) => (
                    <option key={a.id} value={a.id}>
                      🚑 {a.registrationNumber} ({a.ambulanceType}) - Status: {a.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Maintenance Type *</label>
                  <select
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="SCHEDULED_SERVICE">Scheduled Service</option>
                    <option value="BREAKDOWN_REPAIR">Breakdown Repair</option>
                    <option value="BRAKE_INSPECTION">Brake Overhaul</option>
                    <option value="TYRE_REPLACEMENT">Tyre Replacement</option>
                    <option value="ELECTRICAL">Electrical & Siren</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-orange-600"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Issue Description / Defect Details *</label>
                <textarea
                  rows={3}
                  required
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  placeholder="Describe mechanical, electrical, or biomedical defect..."
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Assigned Service Center / Technician</label>
                <input
                  type="text"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow transition-all"
                >
                  Create Work Order & Lock Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sign Off Order Modal */}
      {completeModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Certify & Close Work Order: {completeModalOrder.orderNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Vehicle: <strong>{completeModalOrder.ambulance.registrationNumber}</strong>. Signing off this order will immediately restore the ambulance status to <code>AVAILABLE</code> for dispatch recommendations.
            </p>

            <form onSubmit={handleCompleteOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Technician Work Performed & Notes *</label>
                <textarea
                  rows={3}
                  required
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  placeholder="Detail parts replaced, safety inspections passed, road test results..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setCompleteModalOrder(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-all"
                >
                  Verify & Restore Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
