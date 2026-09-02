import { syncApi } from '../api/endpoints';

const STORAGE_KEY = 'aeromed_offline_sync_queue';

class OfflineSyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
        this.syncNow();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb({ isOnline: this.isOnline, queueCount: this.getQueue().length }));
  }

  getQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  queueEvent(eventType, payload) {
    const queue = this.getQueue();
    const idempotencyKey = `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const eventItem = {
      idempotencyKey,
      eventType,
      payload: typeof payload === 'object' ? JSON.stringify(payload) : payload,
      clientTimestamp: new Date().toISOString()
    };

    queue.push(eventItem);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }

    this.notifyListeners();

    // If online, trigger background sync
    if (this.isOnline) {
      this.syncNow();
    }

    return eventItem;
  }

  async syncNow() {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: true, processedCount: 0 };

    try {
      const res = await syncApi.syncEvents(queue);
      if (res.data && res.data.success) {
        // Clear local queue upon confirmed sync
        localStorage.removeItem(STORAGE_KEY);
        this.notifyListeners();
        return res.data;
      }
    } catch (err) {
      console.error('Offline sync failed, will retry on next reconnect:', err);
    }
    return { success: false, queueCount: queue.length };
  }

  clearQueue() {
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }
}

export default new OfflineSyncService();
