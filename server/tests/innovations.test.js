const request = require('supertest');
const app = require('../src/app');

describe('AeroMed 10 Innovations - Complete Automated Test Suite', () => {
  let operatorToken;
  let adminToken;
  let driverToken;
  let sampleAmbulanceId;
  let sampleCaseId;

  beforeAll(async () => {
    // Authenticate Operator
    const opRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'aeromed123' });
    operatorToken = opRes.body.data.token;

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminRes.body.data.token;

    // Authenticate Driver
    const drvRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'driver1', password: 'aeromed123' });
    driverToken = drvRes.body.data.token;

    // Retrieve sample ambulance
    const ambRes = await request(app)
      .get('/api/ambulances')
      .set('Authorization', `Bearer ${operatorToken}`);
    sampleAmbulanceId = ambRes.body.data[0]?.id;

    // Retrieve or create sample case
    const caseRes = await request(app)
      .get('/api/emergency-cases')
      .set('Authorization', `Bearer ${operatorToken}`);
    sampleCaseId = caseRes.body.data.cases[0]?.id;
  });

  // Innovation 1: AeroMed AI Assistant
  describe('Innovation 1: AeroMed AI Assistant', () => {
    test('should process English query for available ambulances', async () => {
      const res = await request(app)
        .post('/api/chatbot/message')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ message: 'Show all available ambulances', language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.intent).toBe('CHECK_AMBULANCE_AVAILABILITY');
      expect(typeof res.body.reply).toBe('string');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('should process Tamil query for available ambulances', async () => {
      const res = await request(app)
        .post('/api/chatbot/message')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ message: 'இப்போது எந்த ஆம்புலன்ஸ் available-ஆக உள்ளது?', language: 'ta' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.intent).toBe('CHECK_AMBULANCE_AVAILABILITY');
      expect(res.body.reply).toMatch(/ஆம்புலன்ஸ்/);
    });

    test('should return safe disclaimer when user asks for medical diagnosis or treatment', async () => {
      const res = await request(app)
        .post('/api/chatbot/message')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ message: 'What is the treatment and medicine for cardiac arrest?', language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.intent).toBe('CLINICAL_DISCLAIMER');
      expect(res.body.reply).toMatch(/prohibited from providing medical diagnoses/i);
    });

    test('should return "Information is currently unavailable" for unknown non-existent case', async () => {
      const res = await request(app)
        .post('/api/chatbot/message')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ message: 'What is the status of CASE-NONEXISTENT-999?', language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.reply).toMatch(/Information is currently unavailable/i);
    });
  });

  // Innovation 2: Ambulance Readiness Intelligence
  describe('Innovation 2: Ambulance Readiness Intelligence', () => {
    test('should compute explainable 0 to 100 readiness scores for all fleet units', async () => {
      const res = await request(app)
        .get('/api/innovation/readiness')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const firstUnit = res.body.data[0];
      expect(firstUnit).toHaveProperty('overallScore');
      expect(firstUnit.overallScore).toBeGreaterThanOrEqual(0);
      expect(firstUnit.overallScore).toBeLessThanOrEqual(100);
      expect(['READY', 'LIMITED', 'NOT_READY']).toContain(firstUnit.category);
      expect(Array.isArray(firstUnit.factors)).toBe(true);
      expect(firstUnit.factors.length).toBe(6);
    });

    test('should return detailed factor breakdown for a specific vehicle', async () => {
      const res = await request(app)
        .get(`/api/innovation/readiness/${sampleAmbulanceId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('overallScore');
      expect(res.body.data).toHaveProperty('correctiveAction');
      expect(res.body.data).toHaveProperty('factors');
    });
  });

  // Innovation 3: Intelligent Hospital Recommendation
  describe('Innovation 3: Intelligent Hospital Recommendation', () => {
    test('should return Top 3 ranked hospital recommendations with explainable scores', async () => {
      const res = await request(app)
        .get(`/api/innovation/hospital-recommendations/${sampleCaseId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(3);

      const topHosp = res.body.data[0];
      expect(topHosp).toHaveProperty('hospitalName');
      expect(topHosp).toHaveProperty('recommendationScore');
      expect(topHosp).toHaveProperty('etaMins');
      expect(topHosp).toHaveProperty('reasonForRecommendation');
      expect(topHosp.disclaimer).toMatch(/decision-support/i);
    });
  });

  // Innovation 4: Emergency Demand Forecasting
  describe('Innovation 4: Emergency Demand Forecasting', () => {
    test('should generate 24-hour hourly demand curve, baseline comparison, and geographic heatmap', async () => {
      const res = await request(app)
        .get('/api/innovation/demand-forecast')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('baselineComparison');
      expect(res.body.data.baselineComparison).toHaveProperty('proposedModelMAE');
      expect(Array.isArray(res.body.data.hourlyDemand)).toBe(true);
      expect(res.body.data.hourlyDemand.length).toBe(24);
      expect(Array.isArray(res.body.data.heatMapZones)).toBe(true);
      expect(res.body.data.heatMapZones.length).toBeGreaterThan(0);
    });
  });

  // Innovation 5: Dynamic Ambulance Standby Recommendation
  describe('Innovation 5: Dynamic Ambulance Standby Recommendation', () => {
    let recId;

    test('should generate dynamic standby staging recommendations', async () => {
      const res = await request(app)
        .get('/api/innovation/standby-recommendations')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        recId = res.body.data[0].id;
        expect(res.body.data[0]).toHaveProperty('targetZone');
        expect(res.body.data[0]).toHaveProperty('estimatedCoverageIncreasePct');
      }
    });

    test('should allow fleet manager or admin to approve standby repositioning', async () => {
      if (!recId) return;

      const res = await request(app)
        .post(`/api/innovation/standby-recommendations/${recId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  // Innovation 6: Offline Emergency Data Synchronisation
  describe('Innovation 6: Offline Emergency Data Synchronisation', () => {
    const uniqueKey = `IDEMP-${Date.now()}-${Math.random()}`;

    test('should synchronize queued offline events successfully', async () => {
      const res = await request(app)
        .post('/api/sync/events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          events: [
            {
              idempotencyKey: uniqueKey,
              eventType: 'GPS_TELEMETRY',
              payload: JSON.stringify({ ambulanceId: sampleAmbulanceId, lat: 13.0418, lon: 80.2341 }),
              clientTimestamp: new Date().toISOString()
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.processedCount).toBe(1);
    });

    test('should ignore duplicate events with identical idempotencyKey', async () => {
      const res = await request(app)
        .post('/api/sync/events')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          events: [
            {
              idempotencyKey: uniqueKey,
              eventType: 'GPS_TELEMETRY',
              payload: JSON.stringify({ ambulanceId: sampleAmbulanceId, lat: 13.0418, lon: 80.2341 }),
              clientTimestamp: new Date().toISOString()
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.duplicateCount).toBe(1);
      expect(res.body.results[0].status).toBe('DUPLICATE_IGNORED');
    });
  });

  // Innovation 7: Medicine Expiry and Smart Redistribution
  describe('Innovation 7: Medicine Expiry and Smart Redistribution', () => {
    test('should generate cross-fleet redistribution recommendations', async () => {
      const res = await request(app)
        .get('/api/innovation/inventory/redistribution-recommendations')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // Innovation 8: Automatic Sanitisation Workflow
  describe('Innovation 8: Automatic Sanitisation Workflow', () => {
    let taskId;

    test('should create sanitisation task and set vehicle to CLEANING_REQUIRED', async () => {
      const res = await request(app)
        .post('/api/innovation/sanitisation/tasks')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          ambulanceId: sampleAmbulanceId,
          emergencyCaseId: sampleCaseId,
          cleaningPersonnel: 'Hygiene Attendant Murugan'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(Array.isArray(res.body.data.checklists)).toBe(true);
      taskId = res.body.data.id;

      // Verify ambulance status
      const ambRes = await request(app)
        .get(`/api/ambulances/${sampleAmbulanceId}`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(ambRes.body.data.status).toBe('CLEANING_REQUIRED');
    });

    test('should complete sanitisation task and restore vehicle to AVAILABLE upon supervisor sign-off', async () => {
      const res = await request(app)
        .patch(`/api/innovation/sanitisation/tasks/${taskId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          supervisorApprovedBy: 'Station Supervisor Rajesh'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');

      // Verify ambulance restored to AVAILABLE
      const ambRes = await request(app)
        .get(`/api/ambulances/${sampleAmbulanceId}`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(ambRes.body.data.status).toBe('AVAILABLE');
    });
  });

  // Innovation 9: Post-Emergency Intelligence Report
  describe('Innovation 9: Post-Emergency Intelligence Report', () => {
    test('should generate turnaround performance report for a closed/active case', async () => {
      const res = await request(app)
        .get(`/api/innovation/reports/cases/${sampleCaseId}`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('caseNumber');
      expect(res.body.data).toHaveProperty('turnaroundMetrics');
      expect(res.body.data).toHaveProperty('operationalBottlenecks');
      expect(res.body.data).toHaveProperty('suggestedProcessImprovements');
    });
  });

  // Innovation 10: Multi-Agency Emergency Coordination
  describe('Innovation 10: Multi-Agency Emergency Coordination', () => {
    let incidentId;

    test('should list multi-agency incidents with agency breakdowns', async () => {
      const res = await request(app)
        .get('/api/innovation/incidents')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      incidentId = res.body.data[0].id;
    });

    test('should assign resources from multiple agencies (Police, Fire, EMS) to the incident', async () => {
      const res = await request(app)
        .post(`/api/innovation/incidents/${incidentId}/assign-resources`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          agencyType: 'FIRE_AND_RESCUE',
          resourceIdentifier: 'RESCUE-TENDER-SOUTH-01'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resourceIdentifier).toBe('RESCUE-TENDER-SOUTH-01');
    });
  });
});
