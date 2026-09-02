import api from './client';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data)
};

export const emergencyApi = {
  getCases: (params) => api.get('/emergency-cases', { params }),
  getCaseById: (id) => api.get(`/emergency-cases/${id}`),
  createCase: (data) => api.post('/emergency-cases', data),
  getRecommendation: (id) => api.post(`/emergency-cases/${id}/recommend-ambulance`),
  assignAmbulance: (id, payload) => api.post(`/emergency-cases/${id}/assign`, payload),
  dispatchCase: (id) => api.post(`/emergency-cases/${id}/dispatch`),
  updateStatus: (id, payload) => api.patch(`/emergency-cases/${id}/status`, payload)
};

export const ambulanceApi = {
  getAllAmbulances: (params) => api.get('/ambulances', { params }),
  getAmbulanceById: (id) => api.get(`/ambulances/${id}`),
  createAmbulance: (data) => api.post('/ambulances', data),
  updateAmbulance: (id, data) => api.patch(`/ambulances/${id}`, data),
  updateLocation: (id, data) => api.patch(`/ambulances/${id}/location`, data)
};

export const employeeApi = {
  getAllEmployees: (params) => api.get('/employees', { params }),
  getAvailableEmployees: () => api.get('/employees/available'),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.patch(`/employees/${id}`, data)
};

export const hospitalApi = {
  getHospitals: () => api.get('/hospitals'),
  getHospitalById: (id) => api.get(`/hospitals/${id}`),
  getAlerts: (params) => api.get('/hospital-alerts', { params }),
  createAlert: (data) => api.post('/hospital-alerts', data),
  acknowledgeAlert: (id, payload) => api.patch(`/hospital-alerts/${id}/acknowledge`, payload)
};

export const inventoryApi = {
  getCatalog: () => api.get('/inventory/catalog'),
  getAmbulanceInventory: (ambulanceId) => api.get('/inventory', { params: { ambulanceId } }),
  consumeStock: (payload) => api.post('/inventory/consume', payload),
  replenishStock: (payload) => api.post('/inventory/replenish', payload),
  getTransactions: (params) => api.get('/inventory/transactions', { params })
};

export const maintenanceApi = {
  getOrders: (params) => api.get('/maintenance-orders', { params }),
  createOrder: (payload) => api.post('/maintenance-orders', payload),
  updateOrder: (id, payload) => api.patch(`/maintenance-orders/${id}`, payload)
};

export const analyticsApi = {
  getDashboardAnalytics: () => api.get('/analytics')
};

export const auditApi = {
  getAuditLogs: (params) => api.get('/audit-logs', { params })
};

export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`)
};

export const userApi = {
  getAllUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`)
};
