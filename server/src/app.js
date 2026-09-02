const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize Express App
const app = express();

// Security & Parsing Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'AeroMed Emergency Fleet Management Backend',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));

// Placeholders for routes to be loaded in subsequent phases
app.use('/api/emergency-cases', require('./routes/emergencyRoutes'));
app.use('/api/ambulances', require('./routes/ambulanceRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/crew-assignments', require('./routes/crewRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/hospital-alerts', require('./routes/hospitalAlertRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/maintenance-orders', require('./routes/maintenanceRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/audit-logs', require('./routes/auditRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/sos', require('./routes/sosRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/innovation', require('./routes/innovationRoutes'));
app.use('/api/sync', require('./routes/syncRoutes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
