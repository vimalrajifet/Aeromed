import React from 'react';

const STATUS_CONFIGS = {
  // Emergency Case Statuses
  OPEN: { label: 'Open', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
  DISPATCHED: { label: 'Dispatched', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', dot: 'bg-indigo-500' },
  EN_ROUTE_TO_PICKUP: { label: 'En-Route Pickup', bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', dot: 'bg-purple-500' },
  AT_PICKUP: { label: 'At Pickup', bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300', dot: 'bg-pink-500' },
  EN_ROUTE_TO_HOSPITAL: { label: 'En-Route Hospital', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
  ARRIVED_AT_HOSPITAL: { label: 'At Hospital', bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', dot: 'bg-cyan-500' },
  HANDED_OVER: { label: 'Handed Over', bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
  CLOSED: { label: 'Closed', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', dot: 'bg-gray-500' },

  // Ambulance Statuses
  AVAILABLE: { label: 'Available', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  ON_TRIP: { label: 'On Trip', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-500 animate-ping' },
  MAINTENANCE: { label: 'Maintenance', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
  OFFLINE: { label: 'Offline', bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-300', dot: 'bg-slate-400' },

  // Priority Levels
  P1_CRITICAL: { label: 'P1 Critical', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400', dot: 'bg-red-600' },
  P2_HIGH: { label: 'P2 High', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-400', dot: 'bg-orange-500' },
  P3_MEDIUM: { label: 'P3 Medium', bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400', dot: 'bg-yellow-500' },
  P4_LOW: { label: 'P4 Low', bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-400' }
};

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIGS[status] || {
    label: status,
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300',
    dot: 'bg-gray-400'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
