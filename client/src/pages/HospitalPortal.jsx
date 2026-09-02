import React, { useState, useEffect } from 'react';
import { hospitalApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Activity,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export default function HospitalPortal() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ackModalAlert, setAckModalAlert] = useState(null);
  const [ackStatus, setAckStatus] = useState('ACKNOWLEDGED');
  const [ackNotes, setAckNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await hospitalApi.getAlerts();
      setAlerts(res.data.data);
    } catch (err) {
      console.error('Failed to load hospital alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAcknowledge = async (e) => {
    e.preventDefault();
    if (!ackModalAlert) return;
    setSubmitting(true);
    try {
      await hospitalApi.acknowledgeAlert(ackModalAlert.id, {
        status: ackStatus,
        notes: ackNotes
      });
      showToast(`Pre-alert ${ackStatus.toLowerCase()} successfully`, 'success');
      setAckModalAlert(null);
      setAckNotes('');
      fetchAlerts();
    } catch (err) {
      showToast('Failed to update alert status', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Building2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Hospital Emergency Pre-Alert Reception</h1>
            <p className="text-xs text-slate-500">
              Trauma Bay & Critical Care Intake Console • Chennai Medical Network
            </p>
          </div>
        </div>

        <button
          onClick={fetchAlerts}
          className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Alerts</span>
        </button>
      </div>

      {/* Privacy Notice Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center space-x-3 text-xs text-blue-900">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <p>
          <strong>Privacy & Minimum-Necessary Standard:</strong> Displays only essential operational parameters (Case #, category, required trauma department, ETA, resource needs). Patient sensitive personal data is protected.
        </p>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.length === 0 ? (
          <div className="col-span-2 bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No active hospital pre-alerts awaiting intake at this time.
          </div>
        ) : (
          alerts.map((alt) => {
            const isPending = alt.status === 'SENT';
            return (
              <div
                key={alt.id}
                className={`p-6 rounded-3xl border bg-white shadow-sm transition-all space-y-4 ${
                  isPending ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Incident Case
                    </span>
                    <span className="font-extrabold text-base text-slate-900">
                      {alt.emergencyCase?.caseNumber}
                    </span>
                  </div>
                  <StatusBadge status={alt.status} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold block">CATEGORY</span>
                    <span className="font-bold text-slate-800">{alt.emergencyCategory}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-semibold block">DEPARTMENT</span>
                    <span className="font-bold text-blue-700">{alt.requiredDepartment}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Receiving Facility:</span>
                    <strong className="text-slate-900">{alt.hospital.name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Estimated Arrival (ETA):</span>
                    <strong className="text-rose-600 font-bold">
                      {alt.estimatedArrivalTime ? new Date(alt.estimatedArrivalTime).toLocaleTimeString() : 'In-Transit (~12m)'}
                    </strong>
                  </div>
                  {alt.emergencyCase?.assignedAmbulance && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Vehicle Unit:</span>
                      <strong className="text-slate-900">
                        🚑 {alt.emergencyCase.assignedAmbulance.registrationNumber} ({alt.emergencyCase.assignedAmbulance.ambulanceType})
                      </strong>
                    </div>
                  )}
                </div>

                {alt.notes && (
                  <div className="text-xs text-slate-600 italic bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                    <strong>Readiness Directives:</strong> {alt.notes}
                  </div>
                )}

                {/* Acknowledgement Status / Action */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <div className="text-[10px] text-slate-400">
                    {alt.acknowledgedAt
                      ? `Acknowledged: ${new Date(alt.acknowledgedAt).toLocaleTimeString()}`
                      : 'Awaiting Coordinator Response'}
                  </div>

                  {isPending && (
                    <button
                      onClick={() => setAckModalAlert(alt)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
                    >
                      Respond to Pre-Alert
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Response Modal */}
      {ackModalAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Pre-Alert Response: {ackModalAlert.emergencyCase?.caseNumber}
            </h3>

            <form onSubmit={handleAcknowledge} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Acknowledgment Decision</label>
                <select
                  value={ackStatus}
                  onChange={(e) => setAckStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="ACKNOWLEDGED">Acknowledge & Prepare Emergency Bay</option>
                  <option value="PREPARING">Preparing Specialized Trauma Team (Standby)</option>
                  <option value="REJECTED">Divert / Reject (Department at Full Capacity)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Coordinator Response Remarks</label>
                <textarea
                  rows={3}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  placeholder="e.g. Red Bay 1 prepared. Senior Cardiologist alerted. Blood crossmatch requested."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setAckModalAlert(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow transition-all"
                >
                  {submitting ? 'Transmitting...' : 'Confirm Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
