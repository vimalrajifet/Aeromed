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

export const sosApi = {
  createAlert: (data) => api.post('/sos/alert', data),
  broadcastToNearest: (caseId) => api.post(`/sos/broadcast/${caseId}`),
  getStatus: (caseId) => api.get(`/sos/status/${caseId}`),
  advanceMission: (caseId, payload) => api.post(`/sos/advance-mission/${caseId}`, payload)
};

export const chatbotApi = {
  sendMessage: (payload) => api.post('/chatbot/message', payload),
  getHistory: (conversationId) => api.get(`/chatbot/history/${conversationId}`)
};

export const innovationApi = {
  getReadinessScores: () => api.get('/innovation/readiness'),
  getReadinessDetails: (id) => api.get(`/innovation/readiness/${id}`),
  getHospitalRecommendations: (caseId) => api.get(`/innovation/hospital-recommendations/${caseId}`),
  getDemandForecast: () => api.get('/innovation/demand-forecast'),
  getStandbyRecommendations: () => api.get('/innovation/standby-recommendations'),
  approveStandby: (id) => api.post(`/innovation/standby-recommendations/${id}/approve`),
  getRedistributionRecommendations: () => api.get('/innovation/inventory/redistribution-recommendations'),
  approveInventoryTransfer: (id, payload) => api.post(`/innovation/inventory/transfers/${id}/approve`, payload),
  createSanitisationTask: (payload) => api.post('/innovation/sanitisation/tasks', payload),
  updateSanitisationTask: (id, payload) => api.patch(`/innovation/sanitisation/tasks/${id}`, payload),
  getPostEmergencyReport: (caseId) => api.get(`/innovation/reports/cases/${caseId}`),
  getIncidents: () => api.get('/innovation/incidents'),
  createIncident: (payload) => api.post('/innovation/incidents', payload),
  assignIncidentResources: (id, payload) => api.post(`/innovation/incidents/${id}/assign-resources`, payload)
};

export const syncApi = {
  syncEvents: (events) => api.post('/sync/events', { events })
};

