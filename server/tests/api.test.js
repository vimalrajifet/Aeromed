const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('AeroMed Emergency Fleet Management - API Test Suite', () => {
  let adminToken = '';
  let operatorToken = '';
  let driverToken = '';
  let hospitalToken = '';
  let createdCaseId = '';
  let assignedAmbulanceId = '';
  let testHospitalId = '';

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Authentication & Role-Based Access Control', () => {
    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'operator', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should authenticate operator successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'operator', password: 'aeromed123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('OPERATOR');
      operatorToken = res.body.data.token;
    });

    it('should authenticate admin successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.statusCode).toBe(200);
      adminToken = res.body.data.token;
    });

    it('should authenticate driver successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'driver1', password: 'aeromed123' });

      expect(res.statusCode).toBe(200);
      driverToken = res.body.data.token;
    });

    it('should authenticate hospital coordinator successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'hospital_coord', password: 'aeromed123' });

      expect(res.statusCode).toBe(200);
      hospitalToken = res.body.data.token;
    });

    it('should reject driver attempting operator-only emergency case creation (RBAC)', async () => {
      const res = await request(app)
        .post('/api/emergency-cases')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          callerName: 'Unauthorized Tester',
          callerPhone: '+91 99999 99999',
          emergencyType: 'CARDIAC',
          priority: 'P1_CRITICAL',
          pickupAddress: 'Mount Road, Chennai',
          pickupLatitude: 13.0604,
          pickupLongitude: 80.2496
        });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Emergency Case Lifecycle & Allocation Engine', () => {
    it('should create a new emergency case with auto-generated caseNumber', async () => {
      const hospitals = await prisma.hospital.findMany({ take: 1 });
      testHospitalId = hospitals[0].id;

      const res = await request(app)
        .post('/api/emergency-cases')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          callerName: 'Nandhini Raman',
          callerPhone: '+91 98412 34567',
          emergencyType: 'CARDIAC',
          priority: 'P1_CRITICAL',
          description: 'Sudden chest clutching and diaphoresis in 58M.',
          pickupAddress: 'T. Nagar, Panagal Park, Chennai',
          pickupLatitude: 13.0418,
          pickupLongitude: 80.2341,
          destinationHospitalId: testHospitalId
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.emergencyCase.caseNumber).toMatch(/^EMG-\d{4}-\d{4}$/);
      expect(res.body.data.emergencyCase.status).toBe('OPEN');
      createdCaseId = res.body.data.emergencyCase.id;

      // Allocation engine recommendation output check
      expect(res.body.data.recommendation).toBeDefined();
      expect(res.body.data.recommendation.recommended).toBeDefined();
      expect(res.body.data.recommendation.candidates.length).toBeGreaterThan(0);

      // Verify that MAINTENANCE vehicle TN-03-EM-3001 is NEVER recommended
      const candidateRegs = res.body.data.recommendation.candidates.map(c => c.ambulance.registrationNumber);
      expect(candidateRegs).not.toContain('TN-03-EM-3001');

      assignedAmbulanceId = res.body.data.recommendation.recommended.ambulance.id;
    });

    it('should assign recommended ambulance and crew to the case', async () => {
      const availableEmployees = await prisma.employee.findMany({
        where: { availabilityStatus: 'AVAILABLE' }
      });
      const driver = availableEmployees.find(e => e.role === 'DRIVER');
      const medic = availableEmployees.find(e => ['PARAMEDIC', 'DOCTOR'].includes(e.role));

      const res = await request(app)
        .post(`/api/emergency-cases/${createdCaseId}/assign`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          ambulanceId: assignedAmbulanceId,
          driverEmployeeId: driver.id,
          medicalEmployeeId: medic.id
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ASSIGNED');
      expect(res.body.data.assignedAmbulanceId).toBe(assignedAmbulanceId);
    });

    it('should reject invalid status jump (e.g. jumping from ASSIGNED directly to AT_PICKUP)', async () => {
      const res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ status: 'AT_PICKUP' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid status transition');
    });

    it('should dispatch ambulance and transition status to DISPATCHED', async () => {
      const res = await request(app)
        .post(`/api/emergency-cases/${createdCaseId}/dispatch`)
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DISPATCHED');
      expect(res.body.data.dispatchedAt).toBeDefined();

      // Check ambulance status in DB switched to ON_TRIP
      const amb = await prisma.ambulance.findUnique({ where: { id: assignedAmbulanceId } });
      expect(amb.status).toBe('ON_TRIP');
    });

    it('should progress through valid dispatch lifecycle stages', async () => {
      // 1. EN_ROUTE_TO_PICKUP
      let res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'EN_ROUTE_TO_PICKUP' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('EN_ROUTE_TO_PICKUP');

      // 2. AT_PICKUP
      res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'AT_PICKUP' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('AT_PICKUP');
      expect(res.body.data.arrivedAt).toBeDefined();

      // 3. EN_ROUTE_TO_HOSPITAL
      res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'EN_ROUTE_TO_HOSPITAL' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('EN_ROUTE_TO_HOSPITAL');
    });
  });

  describe('3. Hospital Pre-Alert & Coordination', () => {
    let alertId = '';

    it('should create a hospital pre-alert for receiving emergency department', async () => {
      const res = await request(app)
        .post('/api/hospital-alerts')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          emergencyCaseId: createdCaseId,
          hospitalId: testHospitalId,
          emergencyCategory: 'CARDIAC',
          requiredDepartment: 'CARDIOLOGY',
          estimatedArrivalTime: new Date(Date.now() + 15 * 60000).toISOString(),
          notes: 'Prepare Catheterization Laboratory for primary PCI.'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SENT');
      alertId = res.body.data.id;
    });

    it('should allow hospital coordinator to acknowledge the pre-alert', async () => {
      const res = await request(app)
        .patch(`/api/hospital-alerts/${alertId}/acknowledge`)
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({
          status: 'ACKNOWLEDGED',
          notes: 'Cath Lab 2 on standby. Trauma Team Alpha notified.'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACKNOWLEDGED');
      expect(res.body.data.acknowledgedAt).toBeDefined();
    });
  });

  describe('4. Medical Inventory (SAP MM) & Negative Stock Prevention', () => {
    it('should reject material consumption that exceeds available stock (negative stock prevention)', async () => {
      const oxygenItem = await prisma.medicalItem.findUnique({ where: { itemCode: 'MED-OXY-01' } });

      const res = await request(app)
        .post('/api/inventory/consume')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ambulanceId: assignedAmbulanceId,
          medicalItemId: oxygenItem.id,
          quantity: 9999, // Unreasonable quantity
          emergencyCaseId: createdCaseId,
          remarks: 'Excessive test consumption'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Insufficient inventory');
    });

    it('should successfully consume valid stock quantity and record transaction', async () => {
      const oxygenItem = await prisma.medicalItem.findUnique({ where: { itemCode: 'MED-OXY-01' } });
      const currentStock = await prisma.ambulanceInventory.findUnique({
        where: { ambulanceId_medicalItemId: { ambulanceId: assignedAmbulanceId, medicalItemId: oxygenItem.id } }
      });
      const originalQty = currentStock.availableQuantity;

      const res = await request(app)
        .post('/api/inventory/consume')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          ambulanceId: assignedAmbulanceId,
          medicalItemId: oxygenItem.id,
          quantity: 1,
          emergencyCaseId: createdCaseId,
          remarks: 'Administered 10L/min high flow via non-rebreather'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.remainingQuantity).toBe(originalQty - 1);
      expect(res.body.data.transaction.transactionType).toBe('CONSUMPTION');
    });
  });

  describe('5. Fleet Maintenance (SAP PM)', () => {
    let orderId = '';
    let testAmbulanceId = '';

    beforeAll(async () => {
      const amb = await prisma.ambulance.findFirst({ where: { status: 'AVAILABLE' } });
      testAmbulanceId = amb.id;
    });

    it('should create maintenance order and automatically set vehicle status to MAINTENANCE', async () => {
      const res = await request(app)
        .post('/api/maintenance-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ambulanceId: testAmbulanceId,
          maintenanceType: 'BRAKE_INSPECTION',
          issueDescription: 'Brake fluid level low warning on instrument cluster',
          priority: 'HIGH',
          performedBy: 'Lucas TVS Auto Service'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.orderNumber).toMatch(/^WO-\d{4}-\d{3}$/);
      orderId = res.body.data.id;

      // Verify ambulance status changed to MAINTENANCE
      const updatedAmb = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
      expect(updatedAmb.status).toBe('MAINTENANCE');
    });

    it('should complete maintenance order and restore vehicle status to AVAILABLE', async () => {
      const res = await request(app)
        .patch(`/api/maintenance-orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'COMPLETED',
          technicianNotes: 'Brake lines flushed, DOT 4 replenished. Full road test passed.'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');

      // Verify ambulance status restored to AVAILABLE
      const updatedAmb = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
      expect(updatedAmb.status).toBe('AVAILABLE');
    });
  });

  describe('6. Handover, Closure & Analytics Verification', () => {
    it('should progress case to ARRIVED_AT_HOSPITAL and HANDED_OVER', async () => {
      let res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'ARRIVED_AT_HOSPITAL' });
      expect(res.statusCode).toBe(200);

      res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'HANDED_OVER' });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('HANDED_OVER');
    });

    it('should close emergency case and release vehicle and crew to AVAILABLE', async () => {
      const res = await request(app)
        .patch(`/api/emergency-cases/${createdCaseId}/status`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ status: 'CLOSED' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('CLOSED');
      expect(res.body.data.completedAt).toBeDefined();

      // Check ambulance restored to AVAILABLE
      const amb = await prisma.ambulance.findUnique({ where: { id: assignedAmbulanceId } });
      expect(amb.status).toBe('AVAILABLE');
    });

    it('should return calculated real-time analytics with non-zero metrics', async () => {
      const res = await request(app)
        .get('/api/analytics')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview.totalCases).toBeGreaterThanOrEqual(10);
      expect(res.body.data.kpis.avgDispatchTimeMins).toBeGreaterThan(0);
      expect(res.body.data.charts.casesByType.length).toBeGreaterThan(0);
    });

    it('should verify audit log captured all lifecycle events', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const actions = res.body.data.map(l => l.action);
      expect(actions).toContain('CASE_CREATED');
      expect(actions).toContain('CASE_DISPATCHED');
    });
  });
});
