import React, { useState, useEffect } from 'react';
import { inventoryApi, ambulanceApi } from '../api/endpoints';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  AlertTriangle,
  Calendar,
  Plus,
  Minus,
  RefreshCw,
  X,
  FileText,
  Truck
} from 'lucide-react';

export default function Inventory() {
  const { showToast } = useNotifications();
  const { hasRole } = useAuth();
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState('ALL');
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Consumption Modal
  const [consumeModalItem, setConsumeModalItem] = useState(null);
  const [consumeQty, setConsumeQty] = useState(1);
  const [consumeRemarks, setConsumeRemarks] = useState('');

  // Replenish Modal
  const [replenishModalItem, setReplenishModalItem] = useState(null);
  const [replenishQty, setReplenishQty] = useState(10);
  const [replenishRemarks, setReplenishRemarks] = useState('Quarterly warehouse replenishment');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ambRes, invRes, txRes] = await Promise.all([
        ambulanceApi.getAllAmbulances(),
        inventoryApi.getAmbulanceInventory(selectedAmbulanceId),
        inventoryApi.getTransactions({ limit: 20 })
      ]);
      setAmbulances(ambRes.data.data);
      setInventory(invRes.data.data);
      setTransactions(txRes.data.data);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAmbulanceId]);

  const handleConsume = async (e) => {
    e.preventDefault();
    if (!consumeModalItem) return;
    try {
      await inventoryApi.consumeStock({
        ambulanceId: consumeModalItem.ambulanceId,
        medicalItemId: consumeModalItem.medicalItemId,
        quantity: parseInt(consumeQty),
        remarks: consumeRemarks || 'Routine medical consumption'
      });
      showToast(`Consumed ${consumeQty} ${consumeModalItem.medicalItem.unit}s. Stock updated.`, 'success');
      setConsumeModalItem(null);
      setConsumeRemarks('');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Consumption failed (Stock check failed)', 'error');
    }
  };

  const handleReplenish = async (e) => {
    e.preventDefault();
    if (!replenishModalItem) return;
    try {
      await inventoryApi.replenishStock({
        ambulanceId: replenishModalItem.ambulanceId,
        medicalItemId: replenishModalItem.medicalItemId,
        quantity: parseInt(replenishQty),
        remarks: replenishRemarks
      });
      showToast(`Stock replenished (+${replenishQty} units)`, 'success');
      setReplenishModalItem(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Replenishment failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Medical Inventory Management (SAP MM)</h1>
            <p className="text-xs text-slate-500">
              Goods issue, goods receipt, batch expiry tracking, and material transaction ledger
            </p>
          </div>
        </div>

        {/* Vehicle Filter */}
        <div className="flex items-center space-x-3">
          <Truck className="w-4 h-4 text-slate-400" />
          <select
            value={selectedAmbulanceId}
            onChange={(e) => setSelectedAmbulanceId(e.target.value)}
            className="text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
          >
            <option value="ALL">All Fleet Ambulances</option>
            {ambulances.map((a) => (
              <option key={a.id} value={a.id}>
                {a.registrationNumber} ({a.ambulanceType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Onboard Medical Supplies Ledger</h2>
            <p className="text-xs text-slate-500">Real-time inventory levels per ambulance</p>
          </div>
          <button onClick={fetchData} className="p-2 text-slate-400 hover:text-slate-600">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Vehicle</th>
                <th className="px-5 py-3.5">Item & Code</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Available Stock</th>
                <th className="px-5 py-3.5">Threshold</th>
                <th className="px-5 py-3.5">Expiry Date</th>
                <th className="px-5 py-3.5 text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">No inventory records found</td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      🚑 {item.ambulance.registrationNumber}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{item.medicalItem.name}</div>
                      <div className="text-[10px] text-slate-400">{item.medicalItem.itemCode}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {item.medicalItem.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-black text-sm ${
                            item.alerts.isLowStock ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          {item.availableQuantity} {item.medicalItem.unit}s
                        </span>
                        {item.alerts.isLowStock && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full border border-red-200">
                            LOW
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      Min: {item.medicalItem.minimumQuantity} {item.medicalItem.unit}s
                    </td>
                    <td className="px-5 py-3.5">
                      {item.expiryDate ? (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span
                            className={
                              item.alerts.isNearExpiry
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setConsumeModalItem(item);
                          setConsumeQty(1);
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-bold transition-colors inline-flex items-center space-x-1"
                      >
                        <Minus className="w-3 h-3" />
                        <span>Issue</span>
                      </button>
                      <button
                        onClick={() => {
                          setReplenishModalItem(item);
                          setReplenishQty(item.medicalItem.minimumQuantity * 2);
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold transition-colors inline-flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Ledger Audit History (SAP MM Transactions) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <span>Material Document Ledger (Goods Movements)</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Movement Type</th>
                <th className="px-4 py-2.5">Vehicle</th>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">Quantity</th>
                <th className="px-4 py-2.5">Performed By</th>
                <th className="px-4 py-2.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 10).map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-500">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        tx.transactionType === 'CONSUMPTION'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">
                    {tx.ambulance?.registrationNumber}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-slate-900">{tx.medicalItem?.name}</td>
                  <td className="px-4 py-2.5 font-black text-slate-900">
                    {tx.transactionType === 'CONSUMPTION' ? '-' : '+'}
                    {tx.quantity} {tx.medicalItem?.unit}s
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{tx.performedBy}</td>
                  <td className="px-4 py-2.5 text-slate-500 italic max-w-xs truncate">{tx.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goods Issue (Consumption) Modal */}
      {consumeModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Goods Issue: {consumeModalItem.medicalItem.name}
            </h3>
            <p className="text-xs text-slate-500">
              Vehicle: <strong>{consumeModalItem.ambulance.registrationNumber}</strong> • Available: <strong>{consumeModalItem.availableQuantity} {consumeModalItem.medicalItem.unit}s</strong>
            </p>

            <form onSubmit={handleConsume} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quantity to Deduct *</label>
                <input
                  type="number"
                  min="1"
                  max={consumeModalItem.availableQuantity}
                  value={consumeQty}
                  onChange={(e) => setConsumeQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Consumption Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Administered to emergency patient in transit"
                  value={consumeRemarks}
                  onChange={(e) => setConsumeRemarks(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setConsumeModalItem(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow"
                >
                  Confirm Goods Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Goods Receipt (Replenishment) Modal */}
      {replenishModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">
              Goods Receipt: {replenishModalItem.medicalItem.name}
            </h3>
            <p className="text-xs text-slate-500">
              Vehicle: <strong>{replenishModalItem.ambulance.registrationNumber}</strong> • Current Stock: <strong>{replenishModalItem.availableQuantity} {replenishModalItem.medicalItem.unit}s</strong>
            </p>

            <form onSubmit={handleReplenish} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quantity to Add *</label>
                <input
                  type="number"
                  min="1"
                  value={replenishQty}
                  onChange={(e) => setReplenishQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receipt Remarks</label>
                <input
                  type="text"
                  value={replenishRemarks}
                  onChange={(e) => setReplenishRemarks(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setReplenishModalItem(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                >
                  Confirm Goods Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
