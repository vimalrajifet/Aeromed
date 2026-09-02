import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Bell, LogOut, Shield, User as UserIcon, Siren, Check, Edit3, X } from 'lucide-react';

export default function Header({ onToggleSidebar }) {
  const { user, logout, updateUserProfile } = useAuth();
  const { notifications, unreadCount, markRead, showToast } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenProfileModal = () => {
    setEditName(user?.name || '');
    setShowProfileModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try {
      setIsSaving(true);
      await updateUserProfile({ name: editName.trim() });
      if (showToast) showToast('Profile name updated successfully!', 'success');
      setShowProfileModal(false);
    } catch (err) {
      if (showToast) showToast('Failed to update name', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shadow-sm">
      {/* Brand & Prototype Disclaimer */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle navigation"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-md shadow-red-200">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">AeroMed</span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 rounded border border-slate-300">
                SAP Fleet MVP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Educational Emergency Logistics System</p>
          </div>
        </div>
      </div>

      {/* Center Prototype Banner */}
      <div className="hidden xl:flex items-center px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800">
        <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
        Fictional Demonstration Data Only • Non-Certified Educational Environment
      </div>

      {/* User Actions & Notifications */}
      <div className="flex items-center space-x-3">
        {/* Mobile SOS Phone App Direct Button (ADMIN & OPERATOR ONLY) */}
        {(user?.role === 'ADMIN' || user?.role === 'OPERATOR') && (
          <>
            <a
              href="/sos"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-extrabold text-xs shadow-md shadow-red-500/20 hover:from-red-700 hover:to-rose-700 transition-all transform hover:scale-105"
              title="Open Patient Mobile SOS Phone Screen"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>📱 Patient SOS</span>
            </a>

            <a
              href="/vimal"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-extrabold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-700 hover:to-blue-700 transition-all transform hover:scale-105"
              title="Open Live Drone & Traffic Simulation Demo"
            >
              <span>🚁 Demo</span>
            </a>
          </>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-600 rounded-full animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <span className="font-semibold text-sm text-slate-800">System Notifications</span>
                <span className="text-xs text-slate-500">{unreadCount} unread</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">No recent notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition-colors hover:bg-slate-50 flex items-start justify-between ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="space-y-1 pr-2">
                        <div className="font-semibold text-slate-900">{n.title}</div>
                        <div className="text-slate-600 leading-relaxed">{n.message}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-slate-400 hover:text-blue-600 p-1"
                          title="Mark read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current User Badge (Click to Edit Name) */}
        <button
          onClick={handleOpenProfileModal}
          className="flex items-center space-x-3 pl-3 border-l border-slate-200 hover:bg-slate-50 py-1 px-2 rounded-xl transition-all text-left group"
          title="Click to change your display name"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center text-slate-700 font-semibold border border-slate-200 transition-colors">
            {user?.name ? user.name.charAt(0) : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-slate-900 leading-tight group-hover:text-blue-600">
                {user?.name || 'User'}
              </span>
              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center space-x-1 mt-0.5">
              <Shield className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] font-bold text-blue-600 tracking-wide">{user?.role}</span>
            </div>
          </div>
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Sign out of AeroMed"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Edit Profile / Name Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit User Profile Name</h3>
                  <p className="text-[11px] text-slate-400">Account Username: @{user?.username}</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Display Full Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Dr. John Doe (Director)"
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900 text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This will change the name displayed in the top header and system audit trails.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-500">
                  Role: <strong className="text-slate-800 font-bold">{user?.role}</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Email: <strong className="text-slate-800">{user?.email || 'N/A'}</strong>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
