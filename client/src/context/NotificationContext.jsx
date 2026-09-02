import React, { createContext, useContext, useState, useEffect } from 'react';
import { notificationApi } from '../api/endpoints';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await notificationApi.getNotifications();
      const list = res.data.data;
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Periodic notification polling every 10 seconds
    const timer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(timer);
  }, [user]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const markRead = async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markRead, showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-3 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 border bg-slate-900 text-white border-slate-700">
          <div className={`w-3 h-3 rounded-full ${
            toast.type === 'error' ? 'bg-red-500' :
            toast.type === 'warning' ? 'bg-amber-500' :
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
          }`} />
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
