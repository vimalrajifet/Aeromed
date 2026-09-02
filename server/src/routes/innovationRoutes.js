const express = require('express');
const router = express.Router();
const innovationController = require('../controllers/innovationController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Innovation 2: Readiness Intelligence
router.get('/readiness', authMiddleware, innovationController.getReadinessScores);
router.get('/readiness/:id', authMiddleware, innovationController.getReadinessDetails);

// Innovation 3: Intelligent Hospital Recommendation
router.get('/hospital-recommendations/:caseId', authMiddleware, innovationController.getHospitalRecommendations);

// Innovation 4: Demand Forecasting
router.get('/demand-forecast', authMiddleware, innovationController.getDemandForecast);

// Innovation 5: Dynamic Standby Recommendation
router.get('/standby-recommendations', authMiddleware, innovationController.getStandbyRecommendations);
router.post('/standby-recommendations/:id/approve', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'FLEET_MGR'), innovationController.approveStandby);

// Innovation 7: Medicine Expiry & Smart Redistribution
router.get('/inventory/redistribution-recommendations', authMiddleware, requireRole('ADMIN', 'INVENTORY_MGR', 'FLEET_MGR'), innovationController.getRedistributionRecommendations);
router.post('/inventory/transfers/:id/approve', authMiddleware, requireRole('ADMIN', 'INVENTORY_MGR'), innovationController.approveInventoryTransfer);

// Innovation 8: Sanitisation Workflow
router.post('/sanitisation/tasks', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'FLEET_MGR', 'DRIVER'), innovationController.createSanitisationTask);
router.patch('/sanitisation/tasks/:id', authMiddleware, requireRole('ADMIN', 'FLEET_MGR'), innovationController.updateSanitisationTask);

// Innovation 9: Post-Emergency Intelligence Report
router.get('/reports/cases/:caseId', authMiddleware, innovationController.getPostEmergencyReport);

// Innovation 10: Multi-Agency Coordination
router.get('/incidents', authMiddleware, innovationController.getIncidents);
router.post('/incidents', authMiddleware, requireRole('ADMIN', 'OPERATOR'), innovationController.createIncident);
router.post('/incidents/:id/assign-resources', authMiddleware, requireRole('ADMIN', 'OPERATOR'), innovationController.assignIncidentResources);

module.exports = router;
