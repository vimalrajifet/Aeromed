import React, { useState, useEffect } from 'react';
import { emergencyApi, inventoryApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import StatusBadge from '../components/common/StatusBadge';
import {
  Navigation,
  CheckCircle,
  MapPin,
  Clock,
  Package,
  ArrowRight,
  Phone,
  Building2,
  AlertCircle
} from 'lucide-react';

export default function DriverPortal() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [activeCase, setActiveCase] = useState(null);
  const [loading, setLoading] = useState(true);

  // Supply consumption state
  const [catalog, setCatalog] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [consumeQty, setConsumeQty] = useState(1);
  const [consumeRemarks, setConsumeRemarks] = useState('');
  const [submittingConsumption, setSubmittingConsumption] = useState(false);

  const fetchDriverCase = async () => {
    try {
      setLoading(true);
      // Retrieve cases assigned or dispatched
      const res = await emergencyApi.getCases({ limit: 10 });
      const nonClosed = res.data.data.cases.find(
        (c) => !['CLOSED', 'CANCELLED'].includes(c.status)
      );
      setActiveCase(nonClosed || null);

      const catRes = await inventoryApi.getCatalog();
      setCatalog(catRes.data.data);
      if (catRes.data.data.length > 0) {
        setSelectedItem(catRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch driver case:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverCase();
    const interval = setInterval(fetchDriverCase, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = async (nextStatus) => {
    if (!activeCase) return;
    try {
      if (activeCase.status === 'ASSIGNED' && nextStatus === 'DISPATCHED') {
        await emergencyApi.dispatchCase(activeCase.id);
      } else {
        await emergencyApi.updateStatus(activeCase.id, { status: nextStatus });
      }
      showToast(`Mission updated to ${nextStatus}`, 'success');
      fetchDriverCase();
    } catch (err) {
      showToast(err.response?.data?.error || 'Status transition failed', 'error');
    }
  };

  const handleConsumeItem = async (e) => {
    e.preventDefault();
    if (!activeCase || !activeCase.assignedAmbulanceId) {
      showToast('No active ambulance assigned to log supplies', 'error');
      return;
    }
    setSubmittingConsumption(true);
    try {
      await inventoryApi.consumeStock({
        ambulanceId: activeCase.assignedAmbulanceId,
        medicalItemId: selectedItem,
        quantity: parseInt(consumeQty),
        emergencyCaseId: activeCase.id,
        remarks: consumeRemarks || 'Used during transit'
      });
      showToast('Material consumption recorded in SAP MM ledger', 'success');
      setConsumeRemarks('');
      fetchDriverCase();
    } catch (err) {
      showToast(err.response?.data?.error || 'Consumption failed (Stock check failed)', 'error');
    } finally {
      setSubmittingConsumption(false);
    }
  };

  const getNextAction = (status) => {
    switch (status) {
      case 'ASSIGNED':
        return {
          label: 'Accept Call & Dispatch Vehicle',
          nextStatus: 'DISPATCHED',
          color: 'bg-indigo-600 hover:bg-indigo-700'
        };
      case 'DISPATCHED':
        return {
          label: 'Start Journey to Pickup',
          nextStatus: 'EN_ROUTE_TO_PICKUP',
          color: 'bg-purple-600 hover:bg-purple-700'
        };
      case 'EN_ROUTE_TO_PICKUP':
        return {
          label: 'Arrived at Pickup Location',
          nextStatus: 'AT_PICKUP',
          color: 'bg-pink-600 hover:bg-pink-700'
        };
      case 'AT_PICKUP':
        return {
          label: 'Patient Onboard & En Route to Hospital',
          nextStatus: 'EN_ROUTE_TO_HOSPITAL',
          color: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'EN_ROUTE_TO_HOSPITAL':
        return {
          label: 'Arrived at Emergency / Trauma Bay',
          nextStatus: 'ARRIVED_AT_HOSPITAL',
          color: 'bg-cyan-600 hover:bg-cyan-700'
        };
      case 'ARRIVED_AT_HOSPITAL':
        return {
          label: 'Confirm Patient Handover to Hospital',
          nextStatus: 'HANDED_OVER',
          color: 'bg-teal-600 hover:bg-teal-700'
        };
      case 'HANDED_OVER':
        return {
          label: 'Close Call & Return to Ready Status',
          nextStatus: 'CLOSED',
          color: 'bg-emerald-600 hover:bg-emerald-700'
        };
      default:
        return null;
    }
  };

  const nextAction = activeCase ? getNextAction(activeCase.status) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Navigation className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Mobile Driver Dispatch Portal</h1>
            <p className="text-xs text-slate-500">
              Logged in as: <strong>{user?.name}</strong> • Sequential Stage Controls
            </p>
          </div>
        </div>
      </div>

      {!activeCase ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">No Active Emergency Calls Assigned</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your vehicle is currently on standby or available in the control room. Stay tuned for dispatch notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mission Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                  Active Mission
                </span>
                <h2 className="text-xl font-black">{activeCase.caseNumber}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category: {activeCase.emergencyType}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <StatusBadge status={activeCase.status} />
                <div className="mt-1">
                  <StatusBadge status={activeCase.priority} />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Pickup & Hospital Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-purple-700 font-bold uppercase text-[10px]">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Pickup Address</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">{activeCase.pickupAddress}</p>
                  <p className="text-slate-500">
                    Contact: {activeCase.callerName} ({activeCase.callerPhone})
                  </p>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-700 font-bold uppercase text-[10px]">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Target Destination</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {activeCase.destinationHospital?.name || 'Apollo Emergency Greams Road'}
                  </p>
                  <p className="text-slate-500">
                    {activeCase.destinationHospital?.address || 'Greams Lane, Chennai'}
                  </p>
                </div>
              </div>

              {/* Sequential Action Button */}
              {nextAction && (
                <div className="pt-2">
                  <button
                    onClick={() => handleAdvanceStatus(nextAction.nextStatus)}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-white text-sm shadow-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95 ${nextAction.color}`}
                  >
                    <span>{nextAction.label}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    Sequential transition: <strong>{activeCase.status}</strong> → <strong>{nextAction.nextStatus}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Onboard Medical Supply Consumption Quick Logger */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Package className="w-4 h-4 text-teal-600" />
              <span>Record Consumed Medical Supplies (SAP MM)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Directly deduct pharmaceuticals or consumables used during transit. Prevents negative stock.
            </p>

            <form onSubmit={handleConsumeItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">Medical Item</label>
                  <select
                    value={selectedItem}
                    onChange={(e) => setSelectedItem(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {catalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.itemCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={consumeQty}
                    onChange={(e) => setConsumeQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Administration Route</label>
                <input
                  type="text"
                  placeholder="e.g. IV bolus in transit, CPR oxygen support"
                  value={consumeRemarks}
                  onChange={(e) => setConsumeRemarks(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingConsumption}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {submittingConsumption ? 'Deducting...' : 'Deduct Stock Quantity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
