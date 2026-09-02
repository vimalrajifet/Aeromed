// Seed data for AeroMed Emergency Fleet Management
// Fictional demonstration data for educational prototype (Chennai / Tamil Nadu context)

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning existing database records ---');
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.locationHistory.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.ambulanceInventory.deleteMany({});
  await prisma.maintenanceOrder.deleteMany({});
  await prisma.crewAssignment.deleteMany({});
  await prisma.hospitalAlert.deleteMany({});
  await prisma.emergencyCase.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.ambulance.deleteMany({});
  await prisma.hospital.deleteMany({});
  await prisma.medicalItem.deleteMany({});

  console.log('--- Seeding Hospitals (Chennai Trauma & Emergency Centers) ---');
  const hospitals = await Promise.all([
    prisma.hospital.create({
      data: {
        id: 'hosp-001',
        name: 'Apollo Emergency Trauma Centre',
        address: '21 Greams Lane, Thousand Lights, Chennai, TN 600006',
        latitude: 13.0604,
        longitude: 80.2496,
        contactNumber: '+91 44 2829 0200',
        availableDepartments: 'CARDIOLOGY, TRAUMA_CARE, ICU, NEUROLOGY, BURNS',
        availabilityStatus: 'ACCEPTING'
      }
    }),
    prisma.hospital.create({
      data: {
        id: 'hosp-002',
        name: 'Rajiv Gandhi Govt General Hospital',
        address: 'EVR Periyar Salai, Park Town, Chennai, TN 600003',
        latitude: 13.0818,
        longitude: 80.2773,
        contactNumber: '+91 44 2530 5000',
        availableDepartments: 'TRAUMA_CARE, BURNS, ICU, GENERAL, ORTHOPEDICS',
        availabilityStatus: 'ACCEPTING'
      }
    }),
    prisma.hospital.create({
      data: {
        id: 'hosp-003',
        name: 'MIOT International Trauma & Critical Care',
        address: '4/112 Mount Poonamallee Rd, Manapakkam, Chennai, TN 600089',
        latitude: 13.0232,
        longitude: 80.1784,
        contactNumber: '+91 44 4200 2288',
        availableDepartments: 'ORTHOPEDICS, TRAUMA_CARE, ICU, CARDIOLOGY, NEUROLOGY',
        availabilityStatus: 'ACCEPTING'
      }
    }),
    prisma.hospital.create({
      data: {
        id: 'hosp-004',
        name: 'Fortis Malar Emergency Care',
        address: '52 1st Main Rd, Gandhi Nagar, Adyar, Chennai, TN 600020',
        latitude: 13.0067,
        longitude: 80.2575,
        contactNumber: '+91 44 4289 2222',
        availableDepartments: 'CARDIOLOGY, NEUROLOGY, PEDIATRICS, ICU',
        availabilityStatus: 'ACCEPTING'
      }
    })
  ]);

  console.log('--- Seeding Ambulances (15 Vehicles: ALS Stationed at Hospitals + BLS Fleet) ---');
  const ambulances = await Promise.all([
    prisma.ambulance.create({
      data: {
        id: 'amb-001',
        registrationNumber: 'TN-01-EM-1001',
        ambulanceType: 'ALS', // Advanced Life Support - Apollo Hospital
        currentLatitude: 13.0604,
        currentLongitude: 80.2496,
        fuelLevel: 92.5,
        status: 'AVAILABLE',
        odometerReading: 14250.0,
        lastServiceDate: new Date('2026-07-15'),
        nextServiceDate: new Date('2026-10-15')
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-002',
        registrationNumber: 'TN-01-EM-1002',
        ambulanceType: 'BLS', // Basic Life Support
        currentLatitude: 13.0418,
        currentLongitude: 80.2341, // T. Nagar
        fuelLevel: 85.0,
        status: 'AVAILABLE',
        odometerReading: 22100.0,
        lastServiceDate: new Date('2026-06-20'),
        nextServiceDate: new Date('2026-09-20')
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-003',
        registrationNumber: 'TN-02-EM-2001',
        ambulanceType: 'ALS', // Rajiv Gandhi Govt Hospital Base
        currentLatitude: 13.0818,
        currentLongitude: 80.2773,
        fuelLevel: 78.0,
        status: 'AVAILABLE',
        odometerReading: 31400.0,
        lastServiceDate: new Date('2026-08-01'),
        nextServiceDate: new Date('2026-11-01')
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-004',
        registrationNumber: 'TN-02-EM-2002',
        ambulanceType: 'PATIENT_TRANSPORT',
        currentLatitude: 13.0067,
        currentLongitude: 80.2012, // Guindy
        fuelLevel: 65.0,
        status: 'AVAILABLE',
        odometerReading: 48900.0,
        lastServiceDate: new Date('2026-07-28'),
        nextServiceDate: new Date('2026-10-28')
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-005',
        registrationNumber: 'TN-03-EM-3001',
        ambulanceType: 'ALS',
        currentLatitude: 12.9830,
        currentLongitude: 80.2594, // Thiruvanmiyur Depot
        fuelLevel: 45.0,
        status: 'MAINTENANCE', // Excluded from allocation engine
        odometerReading: 61200.0,
        lastServiceDate: new Date('2026-05-10'),
        nextServiceDate: new Date('2026-08-10')
      }
    }),
    // 8 Additional BLS Units
    prisma.ambulance.create({
      data: {
        id: 'amb-006',
        registrationNumber: 'TN-04-EM-4001',
        ambulanceType: 'BLS',
        currentLatitude: 13.0784,
        currentLongitude: 80.2608, // Egmore
        fuelLevel: 90.0,
        status: 'AVAILABLE',
        odometerReading: 16500.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-007',
        registrationNumber: 'TN-04-EM-4002',
        ambulanceType: 'BLS',
        currentLatitude: 13.0333,
        currentLongitude: 80.2667, // Mylapore
        fuelLevel: 82.0,
        status: 'AVAILABLE',
        odometerReading: 19800.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-008',
        registrationNumber: 'TN-05-EM-5001',
        ambulanceType: 'BLS',
        currentLatitude: 12.9815,
        currentLongitude: 80.2180, // Velachery
        fuelLevel: 88.0,
        status: 'AVAILABLE',
        odometerReading: 24300.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-009',
        registrationNumber: 'TN-05-EM-5002',
        ambulanceType: 'BLS',
        currentLatitude: 12.9249,
        currentLongitude: 80.1000, // Tambaram
        fuelLevel: 75.0,
        status: 'AVAILABLE',
        odometerReading: 35600.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-010',
        registrationNumber: 'TN-06-EM-6001',
        ambulanceType: 'BLS',
        currentLatitude: 13.0382,
        currentLongitude: 80.1565, // Porur
        fuelLevel: 95.0,
        status: 'AVAILABLE',
        odometerReading: 12100.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-011',
        registrationNumber: 'TN-06-EM-6002',
        ambulanceType: 'BLS',
        currentLatitude: 13.0500,
        currentLongitude: 80.2121, // Vadapalani
        fuelLevel: 80.0,
        status: 'AVAILABLE',
        odometerReading: 28900.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-012',
        registrationNumber: 'TN-07-EM-7001',
        ambulanceType: 'BLS',
        currentLatitude: 13.0012,
        currentLongitude: 80.2565, // Adyar
        fuelLevel: 86.0,
        status: 'AVAILABLE',
        odometerReading: 21400.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-013',
        registrationNumber: 'TN-07-EM-7002',
        ambulanceType: 'BLS',
        currentLatitude: 13.0536,
        currentLongitude: 80.2642, // Royapettah
        fuelLevel: 91.0,
        status: 'AVAILABLE',
        odometerReading: 15700.0
      }
    }),
    // 2 Additional ALS Units Stationed Always at Hospital Base
    prisma.ambulance.create({
      data: {
        id: 'amb-014',
        registrationNumber: 'TN-08-EM-8001',
        ambulanceType: 'ALS',
        currentLatitude: 13.0232,
        currentLongitude: 80.1784, // MIOT Trauma Hospital
        fuelLevel: 98.0,
        status: 'AVAILABLE',
        odometerReading: 8900.0
      }
    }),
    prisma.ambulance.create({
      data: {
        id: 'amb-015',
        registrationNumber: 'TN-08-EM-8002',
        ambulanceType: 'ALS',
        currentLatitude: 13.0067,
        currentLongitude: 80.2575, // Fortis Malar Hospital
        fuelLevel: 96.0,
        status: 'AVAILABLE',
        odometerReading: 9400.0
      }
    })
  ]);

  console.log('--- Seeding Employees (10 Healthcare & Dispatch Staff) ---');
  const employees = await Promise.all([
    // Drivers
    prisma.employee.create({
      data: {
        id: 'emp-001',
        employeeCode: 'EMP-TN-101',
        name: 'Rajesh Kannan',
        role: 'DRIVER',
        phone: '+91 98401 11223',
        skills: 'HEAVY_VEHICLE_EMERGENCY_EVASION, DEFENSIVE_DRIVING, BASIC_FIRST_AID',
        shift: 'MORNING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-002',
        employeeCode: 'EMP-TN-102',
        name: 'Murugan Velu',
        role: 'DRIVER',
        phone: '+91 98402 22334',
        skills: 'HEAVY_VEHICLE_EMERGENCY_EVASION, GPS_NAVIGATION, DEFENSIVE_DRIVING',
        shift: 'MORNING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-003',
        employeeCode: 'EMP-TN-103',
        name: 'Selvam Arumugam',
        role: 'DRIVER',
        phone: '+91 98403 33445',
        skills: 'DEFENSIVE_DRIVING, ROUTE_OPTIMIZATION',
        shift: 'EVENING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-004',
        employeeCode: 'EMP-TN-104',
        name: 'Karthik Natarajan',
        role: 'DRIVER',
        phone: '+91 98404 44556',
        skills: 'DEFENSIVE_DRIVING, BASIC_CPR',
        shift: 'NIGHT',
        availabilityStatus: 'OFF_DUTY'
      }
    }),
    // Paramedics & Doctors
    prisma.employee.create({
      data: {
        id: 'emp-005',
        employeeCode: 'EMP-TN-201',
        name: 'Dr. Ananya Sundaram',
        role: 'DOCTOR',
        phone: '+91 98405 55667',
        skills: 'ADVANCED_CARDIAC_LIFE_SUPPORT, TRAUMA_RESUSCITATION, INTUBATION',
        shift: 'MORNING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-006',
        employeeCode: 'EMP-TN-202',
        name: 'Priya Venkatesh',
        role: 'PARAMEDIC',
        phone: '+91 98406 66778',
        skills: 'CPR, ADVANCED_AIRWAY, DEFIBRILLATION, ALS_CERTIFIED',
        shift: 'MORNING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-007',
        employeeCode: 'EMP-TN-203',
        name: 'Vikram Ramanathan',
        role: 'PARAMEDIC',
        phone: '+91 98407 77889',
        skills: 'CPR, ALS_CERTIFIED, TRAUMA_MANAGEMENT, VENTILATOR_SUPPORT',
        shift: 'EVENING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    // EMTs
    prisma.employee.create({
      data: {
        id: 'emp-008',
        employeeCode: 'EMP-TN-301',
        name: 'Deepa Subramanian',
        role: 'EMT',
        phone: '+91 98408 88990',
        skills: 'BASIC_LIFE_SUPPORT, PATIENT_IMMOBILIZATION, OXYGEN_ADMINISTRATION',
        shift: 'MORNING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-009',
        employeeCode: 'EMP-TN-302',
        name: 'Suresh Krishnan',
        role: 'EMT',
        phone: '+91 98409 99001',
        skills: 'BASIC_LIFE_SUPPORT, WOUND_DRESSING, CPR',
        shift: 'EVENING',
        availabilityStatus: 'AVAILABLE'
      }
    }),
    prisma.employee.create({
      data: {
        id: 'emp-010',
        employeeCode: 'EMP-TN-303',
        name: 'Saravanan Balaji',
        role: 'EMT',
        phone: '+91 98410 00112',
        skills: 'BASIC_LIFE_SUPPORT, TRIAGE_ASSESSMENT',
        shift: 'NIGHT',
        availabilityStatus: 'ON_LEAVE'
      }
    })
  ]);

  console.log('--- Seeding Users (One account per role + Admin) ---');
  const salt = await bcrypt.genSalt(10);
  const commonPassword = await bcrypt.hash('aeromed123', salt);
  const adminPassword = await bcrypt.hash('admin123', salt);

  await prisma.user.createMany({
    data: [
      {
        id: 'user-admin',
        username: 'admin',
        passwordHash: adminPassword,
        name: 'Vimalanathan S (Director)',
        role: 'ADMIN',
        email: 'admin@aeromed.demo',
        phone: '+91 98800 00001'
      },
      {
        id: 'user-operator',
        username: 'operator',
        passwordHash: commonPassword,
        name: 'Kavitha S (Chief Dispatcher)',
        role: 'OPERATOR',
        email: 'operator@aeromed.demo',
        phone: '+91 98800 00002'
      },
      {
        id: 'user-driver',
        username: 'driver1',
        passwordHash: commonPassword,
        name: 'Rajesh Kannan',
        role: 'DRIVER',
        employeeId: 'emp-001',
        email: 'driver1@aeromed.demo',
        phone: '+91 98401 11223'
      },
      {
        id: 'user-paramedic',
        username: 'paramedic1',
        passwordHash: commonPassword,
        name: 'Priya Venkatesh',
        role: 'MEDICAL_TEAM',
        employeeId: 'emp-006',
        email: 'paramedic1@aeromed.demo',
        phone: '+91 98406 66778'
      },
      {
        id: 'user-hospital',
        username: 'hospital_coord',
        passwordHash: commonPassword,
        name: 'Dr. Meenakshi Sundaresan',
        role: 'HOSPITAL_COORD',
        hospitalId: 'hosp-001',
        email: 'hospital1@aeromed.demo',
        phone: '+91 98800 00005'
      },
      {
        id: 'user-fleet',
        username: 'fleet_mgr',
        passwordHash: commonPassword,
        name: 'Gopalakrishnan V',
        role: 'FLEET_MGR',
        email: 'fleet@aeromed.demo',
        phone: '+91 98800 00006'
      },
      {
        id: 'user-inventory',
        username: 'inventory_mgr',
        passwordHash: commonPassword,
        name: 'Lakshmi Narayanan',
        role: 'INVENTORY_MGR',
        email: 'inventory@aeromed.demo',
        phone: '+91 98800 00007'
      }
    ]
  });

  console.log('--- Seeding Medical Items (15 SAP MM Items) ---');
  const medicalItemsData = [
    { id: 'med-001', itemCode: 'MED-OXY-01', name: 'Oxygen Cylinder (D-Type)', category: 'EQUIPMENT', unit: 'CYLINDER', minimumQuantity: 2, expiryControlled: false },
    { id: 'med-002', itemCode: 'MED-BVM-02', name: 'Bag Valve Mask (Adult)', category: 'EQUIPMENT', unit: 'PIECE', minimumQuantity: 2, expiryControlled: false },
    { id: 'med-003', itemCode: 'MED-CAN-03', name: 'IV Cannula 18G', category: 'CONSUMABLE', unit: 'PACK', minimumQuantity: 10, expiryControlled: true },
    { id: 'med-004', itemCode: 'MED-NS-04', name: 'Normal Saline 500ml', category: 'PHARMACEUTICAL', unit: 'BOTTLE', minimumQuantity: 8, expiryControlled: true },
    { id: 'med-005', itemCode: 'MED-RL-05', name: 'Ringer Lactate 500ml', category: 'PHARMACEUTICAL', unit: 'BOTTLE', minimumQuantity: 6, expiryControlled: true },
    { id: 'med-006', itemCode: 'MED-ADR-06', name: 'Adrenaline 1mg/ml Ampoule', category: 'PHARMACEUTICAL', unit: 'VIAL', minimumQuantity: 5, expiryControlled: true },
    { id: 'med-007', itemCode: 'MED-ATR-07', name: 'Atropine Sulphate 0.6mg', category: 'PHARMACEUTICAL', unit: 'VIAL', minimumQuantity: 5, expiryControlled: true },
    { id: 'med-008', itemCode: 'MED-AED-08', name: 'AED Adult Defibrillator Pads', category: 'EQUIPMENT', unit: 'SET', minimumQuantity: 2, expiryControlled: true },
    { id: 'med-009', itemCode: 'MED-SYR-09', name: 'Sterile Syringes 5ml with Needle', category: 'CONSUMABLE', unit: 'PACK', minimumQuantity: 20, expiryControlled: true },
    { id: 'med-010', itemCode: 'MED-GAU-10', name: 'Sterile Gauze Rolls 10cm', category: 'CONSUMABLE', unit: 'ROLL', minimumQuantity: 15, expiryControlled: false },
    { id: 'med-011', itemCode: 'MED-COL-11', name: 'Cervical Collar (Adjustable Adult)', category: 'EQUIPMENT', unit: 'PIECE', minimumQuantity: 2, expiryControlled: false },
    { id: 'med-012', itemCode: 'MED-OXI-12', name: 'Pulse Oximeter Finger Sensor', category: 'EQUIPMENT', unit: 'PIECE', minimumQuantity: 2, expiryControlled: false },
    { id: 'med-013', itemCode: 'MED-SUC-13', name: 'Suction Catheter Yankauer', category: 'CONSUMABLE', unit: 'PIECE', minimumQuantity: 5, expiryControlled: false },
    { id: 'med-014', itemCode: 'MED-TOR-14', name: 'Tactical Tourniquet Combat C-A-T', category: 'EQUIPMENT', unit: 'PIECE', minimumQuantity: 3, expiryControlled: false },
    { id: 'med-015', itemCode: 'MED-PCM-15', name: 'Paracetamol IV Infusion 100ml', category: 'PHARMACEUTICAL', unit: 'BOTTLE', minimumQuantity: 5, expiryControlled: true }
  ];

  await prisma.medicalItem.createMany({ data: medicalItemsData });

  console.log('--- Seeding Ambulance Inventories ---');
  const expiryDate1 = new Date('2027-06-30');
  const expiryDateNear = new Date('2026-10-15'); // near expiry

  for (const amb of ambulances) {
    await prisma.ambulanceInventory.createMany({
      data: [
        { ambulanceId: amb.id, medicalItemId: 'med-001', availableQuantity: 3, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-002', availableQuantity: 3, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-003', availableQuantity: 15, expiryDate: expiryDate1 },
        { ambulanceId: amb.id, medicalItemId: 'med-004', availableQuantity: 10, expiryDate: expiryDate1 },
        { ambulanceId: amb.id, medicalItemId: 'med-005', availableQuantity: 8, expiryDate: expiryDate1 },
        { ambulanceId: amb.id, medicalItemId: 'med-006', availableQuantity: 6, expiryDate: expiryDateNear },
        { ambulanceId: amb.id, medicalItemId: 'med-007', availableQuantity: 6, expiryDate: expiryDate1 },
        { ambulanceId: amb.id, medicalItemId: 'med-008', availableQuantity: 3, expiryDate: expiryDate1 },
        { ambulanceId: amb.id, medicalItemId: 'med-009', availableQuantity: 25, expiryDate: expiryDate1 },
        { ambulanceId: amb.id, medicalItemId: 'med-010', availableQuantity: 20, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-011', availableQuantity: 2, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-012', availableQuantity: 2, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-013', availableQuantity: 6, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-014', availableQuantity: 4, expiryDate: null },
        { ambulanceId: amb.id, medicalItemId: 'med-015', availableQuantity: 6, expiryDate: expiryDate1 }
      ]
    });
  }

  console.log('--- Seeding 6 Maintenance Orders (SAP PM Simulation) ---');
  await prisma.maintenanceOrder.createMany({
    data: [
      {
        id: 'mo-001',
        orderNumber: 'WO-2026-001',
        ambulanceId: 'amb-005',
        maintenanceType: 'BREAKDOWN_REPAIR',
        issueDescription: 'Engine alternator failure and severe brake pad grinding',
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        scheduledDate: new Date('2026-09-01'),
        technicianNotes: 'Alternator replacement received from OEM; brake rotors undergoing machining.',
        performedBy: 'Murugesan Auto Care, Guindy'
      },
      {
        id: 'mo-002',
        orderNumber: 'WO-2026-002',
        ambulanceId: 'amb-001',
        maintenanceType: 'SCHEDULED_SERVICE',
        issueDescription: 'Quarterly 15,000km routine service and synthetic oil change',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        scheduledDate: new Date('2026-07-15'),
        completedDate: new Date('2026-07-16'),
        technicianNotes: 'Engine oil, coolant, and cabin filters replaced. Vehicle certified fit.',
        performedBy: 'TVS Mobility Services'
      },
      {
        id: 'mo-003',
        orderNumber: 'WO-2026-003',
        ambulanceId: 'amb-002',
        maintenanceType: 'TYRE_REPLACEMENT',
        issueDescription: 'Rear tyre tread wear below safety threshold (2.5mm)',
        priority: 'HIGH',
        status: 'COMPLETED',
        scheduledDate: new Date('2026-08-10'),
        completedDate: new Date('2026-08-10'),
        technicianNotes: 'Pair of MRF Steel Muscle tyres fitted with wheel balancing.',
        performedBy: 'Apollo Tyres Service Hub'
      },
      {
        id: 'mo-004',
        orderNumber: 'WO-2026-004',
        ambulanceId: 'amb-003',
        maintenanceType: 'ELECTRICAL',
        issueDescription: 'Strobe light bar intermittent failure on siren activation',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        scheduledDate: new Date('2026-08-22'),
        completedDate: new Date('2026-08-23'),
        technicianNotes: 'Relay switch replaced and grounding terminal re-soldered.',
        performedBy: 'Lucas TVS Auto Electricals'
      },
      {
        id: 'mo-005',
        orderNumber: 'WO-2026-005',
        ambulanceId: 'amb-004',
        maintenanceType: 'BRAKE_INSPECTION',
        issueDescription: 'Brake pedal slight spongy feel on hard braking',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        scheduledDate: new Date('2026-08-29'),
        completedDate: new Date('2026-08-30'),
        technicianNotes: 'Brake lines bled and DOT 4 fluid topped up.',
        performedBy: 'TVS Mobility Services'
      },
      {
        id: 'mo-006',
        orderNumber: 'WO-2026-006',
        ambulanceId: 'amb-005',
        maintenanceType: 'SCHEDULED_SERVICE',
        issueDescription: 'Pending bi-annual medical equipment calibration and oxygen pipeline inspection',
        priority: 'HIGH',
        status: 'PENDING',
        scheduledDate: new Date('2026-09-08'),
        technicianNotes: 'Scheduled with Philips & Dräger certified bio-medical engineers.',
        performedBy: 'BioMed Tech Solutions'
      }
    ]
  });

  console.log('--- Seeding 10 Historical Emergency Cases ---');
  const pastCases = [
    {
      id: 'case-001',
      caseNumber: 'EMG-2026-0001',
      callerName: 'Sundararajan M',
      callerPhone: '+91 94440 12345',
      emergencyType: 'CARDIAC',
      priority: 'P1_CRITICAL',
      description: '62-year-old male experiencing acute retrosternal chest pain and sweating.',
      pickupAddress: 'Block 4, Door 18, Anna Nagar West Extension, Chennai',
      pickupLatitude: 13.0891,
      pickupLongitude: 80.2032,
      destinationHospitalId: 'hosp-001',
      assignedAmbulanceId: 'amb-001',
      status: 'CLOSED',
      createdAt: new Date('2026-08-28T08:15:00Z'),
      dispatchedAt: new Date('2026-08-28T08:17:30Z'),
      arrivedAt: new Date('2026-08-28T08:29:00Z'),
      completedAt: new Date('2026-08-28T09:12:00Z')
    },
    {
      id: 'case-002',
      caseNumber: 'EMG-2026-0002',
      callerName: 'Revathi S',
      callerPhone: '+91 98411 98765',
      emergencyType: 'TRAUMA',
      priority: 'P1_CRITICAL',
      description: 'Two-wheeler collision at Kathipara flyover junction. Suspected femur fracture.',
      pickupAddress: 'Kathipara Junction Grade Separator, Guindy, Chennai',
      pickupLatitude: 13.0076,
      pickupLongitude: 80.2045,
      destinationHospitalId: 'hosp-003',
      assignedAmbulanceId: 'amb-004',
      status: 'CLOSED',
      createdAt: new Date('2026-08-28T14:30:00Z'),
      dispatchedAt: new Date('2026-08-28T14:32:00Z'),
      arrivedAt: new Date('2026-08-28T14:41:00Z'),
      completedAt: new Date('2026-08-28T15:25:00Z')
    },
    {
      id: 'case-003',
      caseNumber: 'EMG-2026-0003',
      callerName: 'Balasubramaniam K',
      callerPhone: '+91 97900 23456',
      emergencyType: 'RESPIRATORY',
      priority: 'P2_HIGH',
      description: 'Known COPD patient with severe bronchospasm, SpO2 84% on room air.',
      pickupAddress: '24 South Mada St, Mylapore, Chennai',
      pickupLatitude: 13.0336,
      pickupLongitude: 80.2690,
      destinationHospitalId: 'hosp-004',
      assignedAmbulanceId: 'amb-002',
      status: 'CLOSED',
      createdAt: new Date('2026-08-29T09:10:00Z'),
      dispatchedAt: new Date('2026-08-29T09:13:00Z'),
      arrivedAt: new Date('2026-08-29T09:24:00Z'),
      completedAt: new Date('2026-08-29T10:05:00Z')
    },
    {
      id: 'case-004',
      caseNumber: 'EMG-2026-0004',
      callerName: 'Kavitha Ramesh',
      callerPhone: '+91 98840 34567',
      emergencyType: 'STROKE',
      priority: 'P1_CRITICAL',
      description: 'Sudden onset right-sided facial drooping and slurred speech. Window < 2 hours.',
      pickupAddress: '78 North Usman Road, T. Nagar, Chennai',
      pickupLatitude: 13.0416,
      pickupLongitude: 80.2337,
      destinationHospitalId: 'hosp-001',
      assignedAmbulanceId: 'amb-001',
      status: 'CLOSED',
      createdAt: new Date('2026-08-29T17:40:00Z'),
      dispatchedAt: new Date('2026-08-29T17:42:00Z'),
      arrivedAt: new Date('2026-08-29T17:51:00Z'),
      completedAt: new Date('2026-08-29T18:35:00Z')
    },
    {
      id: 'case-005',
      caseNumber: 'EMG-2026-0005',
      callerName: 'Naveen Kumar',
      callerPhone: '+91 91760 45678',
      emergencyType: 'MATERNITY',
      priority: 'P2_HIGH',
      description: 'Primigravida 38 weeks with active labour contractions every 3 minutes.',
      pickupAddress: '15 Gandhi Irwin Road, Egmore, Chennai',
      pickupLatitude: 13.0784,
      pickupLongitude: 80.2612,
      destinationHospitalId: 'hosp-002',
      assignedAmbulanceId: 'amb-002',
      status: 'CLOSED',
      createdAt: new Date('2026-08-30T04:20:00Z'),
      dispatchedAt: new Date('2026-08-30T04:22:30Z'),
      arrivedAt: new Date('2026-08-30T04:31:00Z'),
      completedAt: new Date('2026-08-30T05:10:00Z')
    },
    {
      id: 'case-006',
      caseNumber: 'EMG-2026-0006',
      callerName: 'Venkatesan T',
      callerPhone: '+91 94450 56789',
      emergencyType: 'ACCIDENT',
      priority: 'P2_HIGH',
      description: 'Pedestrian hit by auto-rickshaw. Minor lacerations and head contusion.',
      pickupAddress: 'LB Road Signal, Thiruvanmiyur, Chennai',
      pickupLatitude: 12.9836,
      pickupLongitude: 80.2582,
      destinationHospitalId: 'hosp-004',
      assignedAmbulanceId: 'amb-004',
      status: 'CLOSED',
      createdAt: new Date('2026-08-30T11:05:00Z'),
      dispatchedAt: new Date('2026-08-30T11:08:00Z'),
      arrivedAt: new Date('2026-08-30T11:18:00Z'),
      completedAt: new Date('2026-08-30T12:00:00Z')
    },
    {
      id: 'case-007',
      caseNumber: 'EMG-2026-0007',
      callerName: 'Chandrasekar P',
      callerPhone: '+91 98400 67890',
      emergencyType: 'CARDIAC',
      priority: 'P1_CRITICAL',
      description: 'Elderly patient collapsed in temple compound. CPR initiated by bystander.',
      pickupAddress: 'Kapaleeshwarar Temple West Gate, Mylapore, Chennai',
      pickupLatitude: 13.0334,
      pickupLongitude: 80.2678,
      destinationHospitalId: 'hosp-001',
      assignedAmbulanceId: 'amb-001',
      status: 'CLOSED',
      createdAt: new Date('2026-08-31T07:15:00Z'),
      dispatchedAt: new Date('2026-08-31T07:17:00Z'),
      arrivedAt: new Date('2026-08-31T07:25:00Z'),
      completedAt: new Date('2026-08-31T08:10:00Z')
    },
    {
      id: 'case-008',
      caseNumber: 'EMG-2026-0008',
      callerName: 'Gayathri S',
      callerPhone: '+91 97890 78901',
      emergencyType: 'GENERAL',
      priority: 'P3_MEDIUM',
      description: 'Acute dehydration, high grade fever with tremors.',
      pickupAddress: '12 Shastri Nagar 2nd Avenue, Adyar, Chennai',
      pickupLatitude: 13.0012,
      pickupLongitude: 80.2541,
      destinationHospitalId: 'hosp-004',
      assignedAmbulanceId: 'amb-002',
      status: 'CLOSED',
      createdAt: new Date('2026-08-31T15:30:00Z'),
      dispatchedAt: new Date('2026-08-31T15:34:00Z'),
      arrivedAt: new Date('2026-08-31T15:47:00Z'),
      completedAt: new Date('2026-08-31T16:28:00Z')
    },
    {
      id: 'case-009',
      caseNumber: 'EMG-2026-0009',
      callerName: 'Harish R',
      callerPhone: '+91 98841 89012',
      emergencyType: 'TRAUMA',
      priority: 'P1_CRITICAL',
      description: 'Industrial burn injury from hot steam boiler valve rupture.',
      pickupAddress: 'Ambattur Industrial Estate Phase 2, Chennai',
      pickupLatitude: 13.0988,
      pickupLongitude: 80.1610,
      destinationHospitalId: 'hosp-002',
      assignedAmbulanceId: 'amb-003',
      status: 'CLOSED',
      createdAt: new Date('2026-09-01T10:00:00Z'),
      dispatchedAt: new Date('2026-09-01T10:03:00Z'),
      arrivedAt: new Date('2026-09-01T10:16:00Z'),
      completedAt: new Date('2026-09-01T11:15:00Z')
    },
    {
      id: 'case-010',
      caseNumber: 'EMG-2026-0010',
      callerName: 'Divya M',
      callerPhone: '+91 91761 90123',
      emergencyType: 'CARDIAC',
      priority: 'P1_CRITICAL',
      description: 'Syncopal episode with palpitations in 55-year-old female.',
      pickupAddress: '3rd Cross Street, Besant Nagar, Chennai',
      pickupLatitude: 12.9998,
      pickupLongitude: 80.2680,
      destinationHospitalId: 'hosp-004',
      assignedAmbulanceId: 'amb-001',
      status: 'CLOSED',
      createdAt: new Date('2026-09-01T18:45:00Z'),
      dispatchedAt: new Date('2026-09-01T18:47:00Z'),
      arrivedAt: new Date('2026-09-01T18:56:00Z'),
      completedAt: new Date('2026-09-01T19:40:00Z')
    }
  ];

  for (const c of pastCases) {
    await prisma.emergencyCase.create({ data: c });
  }

  console.log('--- Seeding Initial Audit Log & Notification ---');
  await prisma.auditLog.create({
    data: {
      userId: 'user-admin',
      userRole: 'ADMIN',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      entityId: 'ROOT',
      details: JSON.stringify({ message: 'AeroMed Emergency Fleet Management database initialized and seeded successfully.' }),
      ipAddress: '127.0.0.1'
    }
  });

  await prisma.notification.create({
    data: {
      recipientRole: 'OPERATOR',
      title: 'AeroMed Control Center Ready',
      message: 'Fleet dispatch system online. 4 ambulances available on Chennai road network.',
      type: 'INFO'
    }
  });

  console.log('=== SEEDING COMPLETED SUCCESSFULLY ===');
  console.log('Demo Accounts:');
  console.log('  Admin:          admin / admin123');
  console.log('  Operator:       operator / aeromed123');
  console.log('  Driver:         driver1 / aeromed123');
  console.log('  Medical Team:   paramedic1 / aeromed123');
  console.log('  Hospital Coord: hospital_coord / aeromed123');
  console.log('  Fleet Mgr:      fleet_mgr / aeromed123');
  console.log('  Inventory Mgr:  inventory_mgr / aeromed123');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
