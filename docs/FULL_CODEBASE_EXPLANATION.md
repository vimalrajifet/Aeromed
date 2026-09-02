# AeroMed Emergency Fleet Management — Comprehensive Codebase Explanation

> **Educational Prototype Notice:** This software is an architectural demonstration prototype developed for educational purposes. It uses fictional demonstration data from Chennai, Tamil Nadu. Do not represent or use it as a certified medical, dispatch, or traffic-control system.

---

## 📑 Table of Contents
1. [Architectural Overview & SAP Alignment](#1-architectural-overview--sap-alignment)
2. [Database Layer (Prisma ORM & 14 Relational Models)](#2-database-layer-prisma-orm--14-relational-models)
3. [Backend Service Layer & Business Logic](#3-backend-service-layer--business-logic)
4. [Backend Middleware & Security (RBAC & Audit)](#4-backend-middleware--security-rbac--audit)
5. [Backend Controllers & API Routes](#5-backend-controllers--api-routes)
6. [Shortest Road Routing Engine (Dijkstra / OSRM)](#6-shortest-road-routing-engine-dijkstra--osrm)
7. [Frontend Architecture (React 18, Vite & Tailwind)](#7-frontend-architecture-react-18-vite--tailwind)
8. [Client Pages & Operational Portals](#8-client-pages--operational-portals)
9. [Automated Test Suite (21 Integration Tests)](#9-automated-test-suite-21-integration-tests)
10. [End-to-End Emergency Incident Lifecycle Walkthrough](#10-end-to-end-emergency-incident-lifecycle-walkthrough)

---

## 1. Architectural Overview & SAP Alignment

AeroMed is designed as a **modular three-tier service architecture** structured to model enterprise SAP business processes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION TIER                             │
│       React 18 + Vite + Tailwind CSS + Leaflet Maps + Recharts        │
│    (Role-based UI: Control Room, Driver, Hospital, Fleet, Inventory)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP REST / JSON (JWT Protected)
┌───────────────────────────────────▼────────────────────────────────────┐
│                           APPLICATION TIER                             │
│                  Node.js + Express Modular Services                    │
│  ┌───────────────────────┬───────────────────────┬──────────────────┐  │
│  │ Allocation Engine     │ Dispatch Lifecycle    │ GPS Simulator    │  │
│  │ (Haversine + Scoring) │ (9-State Machine)     │ (5s Telematics)  │  │
│  ├───────────────────────┼───────────────────────┼──────────────────┤  │
│  │ Material Ledger       │ Plant Maintenance     │ GRC Audit Logger │  │
│  │ (SAP MM Deductions)   │ (SAP PM Work Orders)  │ (Immutable Trail)│  │
│  └───────────────────────┴───────────────────────┴──────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma ORM Client
┌───────────────────────────────────▼────────────────────────────────────┐
│                             DATA TIER                                  │
│                 SQLite Relational Database (dev.db)                    │
│    (14 Relational Tables with Indexes, Enums, Foreign Keys & Cascades) │
└────────────────────────────────────────────────────────────────────────┘
```

### SAP Module Analogy Matrix

| AeroMed Feature | SAP Module Equivalent | Enterprise Purpose |
| :--- | :--- | :--- |
| **Emergency Case & Allocation** | **SAP Transportation Management (TM) / S/4HANA Service** | Dynamic demand intake, rule-based vehicle allocation, and routing |
| **Fleet Maintenance** | **SAP Plant Maintenance (PM)** | Preventive maintenance, breakdown work orders (`WO-YYYY-XXX`), vehicle downtime lockout |
| **Medical Supplies** | **SAP Materials Management (MM)** | Inventory ledger, goods issue (consumption), goods receipt (restocking), negative-stock prevention |
| **Staff & Shifts** | **SAP Human Capital Management (HCM) / SuccessFactors** | Crew rosters, clinical skill certifications, shift scheduling, on-duty tracking |
| **Hospital Pre-Alerts** | **SAP Event Mesh / BTP Integration** | Asynchronous event notifications sent to external hospital emergency departments |
| **Audit Logs** | **SAP Governance, Risk & Compliance (GRC)** | Immutable record of dispatch events, overrides, and clinical access |

---

## 2. Database Layer (Prisma ORM & 14 Relational Models)

Located in [`server/prisma/schema.prisma`](file:///d:/ambulance/server/prisma/schema.prisma), the schema models all operational entities with foreign keys, indexes, and status constraints:

```
                  ┌──────────────┐
                  │     User     │
                  └──────┬───────┘
                         │ 1:N
┌────────────────────────┼────────────────────────┐
│                        │                        │
▼                        ▼                        ▼
EmergencyCase ──────► Ambulance ◄───── MaintenanceOrder
│                        │
├──────► HospitalAlert   ├──────► LocationHistory
│                        │
├──────► CrewAssignment  └──────► AmbulanceInventory ◄─── MedicalItem
│           │                           │
│           ▼                           ▼
│       Employee               InventoryTransaction
▼
Hospital
```

### Model Reference Guide

1. **`User`:**
   - **Fields:** `id`, `username`, `password` (bcrypt hash), `name`, `role`, `email`, `phone`, `isActive`, `createdAt`.
   - **Roles:** `ADMIN`, `OPERATOR`, `DRIVER`, `MEDICAL_TEAM`, `HOSPITAL_COORD`, `FLEET_MGR`, `INVENTORY_MGR`.
2. **`EmergencyCase`:**
   - **Fields:** `caseNumber` (e.g. `EMG-2026-0001`), `callerName`, `callerPhone`, `emergencyType`, `priority` (`P1_CRITICAL` to `P4_NON_URGENT`), `description`, `pickupAddress`, `pickupLatitude`, `pickupLongitude`, `status`, `dispatchedAt`, `arrivedPickupAt`, `handedOverAt`, `closedAt`.
   - **Foreign Keys:** `assignedAmbulanceId`, `destinationHospitalId`, `createdById`.
3. **`Ambulance`:**
   - **Fields:** `registrationNumber` (e.g. `TN-01-EM-1001`), `ambulanceType` (`ALS`, `BLS`, `PTS`), `currentLatitude`, `currentLongitude`, `fuelLevel` (%), `status` (`AVAILABLE`, `ASSIGNED`, `ON_TRIP`, `MAINTENANCE`, `OFFLINE`), `odometerReading`, `lastServiceDate`, `nextServiceDate`.
4. **`Employee`:**
   - **Fields:** `employeeCode` (e.g. `EMP-TN-101`), `name`, `role` (`DRIVER`, `PARAMEDIC`, `DOCTOR`, `EMT`), `phone`, `skills` (comma-separated), `shift` (`MORNING`, `EVENING`, `NIGHT`), `availabilityStatus` (`AVAILABLE`, `ASSIGNED`, `OFF_DUTY`, `ON_LEAVE`).
5. **`CrewAssignment`:**
   - Links `EmergencyCase`, `Ambulance`, and `Employee` with assignment and release timestamps.
6. **`Hospital`:**
   - **Fields:** `name`, `address`, `latitude`, `longitude`, `contactNumber`, `availableDepartments`, `availabilityStatus` (`ACCEPTING`, `DIVERTING`, `FULL`).
7. **`HospitalAlert`:**
   - **Fields:** `alertType`, `patientCondition`, `estimatedArrivalMinutes`, `status` (`PENDING`, `ACKNOWLEDGED`, `REJECTED`), `coordinatorNotes`, `acknowledgedAt`.
8. **`MedicalItem`:**
   - **Fields:** `itemCode` (e.g. `MED-OXY-01`), `name`, `category`, `unit`, `minimumQuantity`, `expiryControlled`.
9. **`AmbulanceInventory`:**
   - **Fields:** `ambulanceId`, `medicalItemId`, `availableQuantity`, `expiryDate`.
10. **`InventoryTransaction`:**
    - **Fields:** `transactionType` (`CONSUMPTION`, `REPLENISHMENT`, `ADJUSTMENT`), `quantity`, `performedBy`, `remarks`, `timestamp`.
11. **`MaintenanceOrder`:**
    - **Fields:** `orderNumber` (e.g. `WO-2026-001`), `ambulanceId`, `maintenanceType`, `issueDescription`, `priority`, `scheduledDate`, `completedDate`, `status` (`PENDING`, `IN_PROGRESS`, `COMPLETED`), `technicianNotes`, `performedBy`.
12. **`LocationHistory`:**
    - Stores chronological GPS breadcrumbs (`ambulanceId`, `latitude`, `longitude`, `speedKmH`, `recordedAt`).
13. **`Notification`:**
    - System notifications for low stock, urgent pre-alerts, or maintenance flags.
14. **`AuditLog`:**
    - Immutable event logging: `userId`, `userRole`, `action`, `entityType`, `entityId`, `details` (JSON payload), `ipAddress`, `timestamp`.

---

## 3. Backend Service Layer & Business Logic

### A. Rule-Based Allocation Engine ([`server/src/services/allocationEngine.js`](file:///d:/ambulance/server/src/services/allocationEngine.js))
Calculates multi-factor suitability without "black-box" models:
1. **Maintenance Exclusion:** Filters out any vehicle where `status = 'MAINTENANCE'` or `status = 'OFFLINE'`.
2. **Haversine Distance (40% Weight):**
   $$d = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
   Normalized to a score between 0 and 100 ($100 - \text{distance} \times 10$).
3. **Ambulance Type Match (25% Weight):**
   - $P1$ Critical requires Advanced Life Support (ALS) $\rightarrow 100$ points.
   - $P2$ Urgent matches Basic Life Support (BLS) $\rightarrow 100$ points.
   - $P3 / P4$ matches Patient Transport (PTS) $\rightarrow 100$ points.
4. **Crew Availability (20% Weight):**
   - Active driver + on-duty paramedic/doctor $\rightarrow 100$ points.
5. **Equipment Availability (15% Weight):**
   - Evaluates onboard inventory for vital emergency supplies (Oxygen cylinder $> 0$ and Defibrillator AED pads $> 0$).
6. **Total Score:**
   $$\text{Total} = (0.40 \times \text{DistanceScore}) + (0.25 \times \text{TypeScore}) + (0.20 \times \text{CrewScore}) + (0.15 \times \text{EquipmentScore})$$

### B. Dispatch State Machine ([`server/src/services/dispatchService.js`](file:///d:/ambulance/server/src/services/dispatchService.js))
Enforces a strict directed acyclic graph:
```
OPEN ──► ASSIGNED ──► DISPATCHED ──► EN_ROUTE_TO_PICKUP ──► AT_PICKUP
                                                               │
CLOSED ◄── HANDED_OVER ◄── ARRIVED_AT_HOSPITAL ◄── EN_ROUTE_TO_HOSPITAL
```
- **Rejection of Invalid Transitions:** Skipping stages (e.g. `ASSIGNED` $\rightarrow$ `AT_PICKUP`) triggers a `400 Bad Request` with permitted next steps.
- **Resource Recovery:** Advancing a case to `CLOSED` or `CANCELLED` automatically restores the ambulance status to `AVAILABLE` and crew members to `AVAILABLE`.

### C. Medical Inventory & Negative-Stock Prevention ([`server/src/services/inventoryService.js`](file:///d:/ambulance/server/src/services/inventoryService.js))
- **Goods Issue (Consumption):**
  Checks `availableQuantity >= requestedQuantity`. If insufficient, throws `400 Bad Request: Insufficient inventory`. Prevents negative inventory balances.
- **Automatic Low-Stock Alerts:**
  When updated quantity drops below `minimumQuantity`, creates a persistent system `Notification` for inventory managers.
- **Goods Receipt (Replenishment):**
  Increments stock and records an immutable `InventoryTransaction` record.

### D. Plant Maintenance Auto-Locking ([`server/src/services/maintenanceService.js`](file:///d:/ambulance/server/src/services/maintenanceService.js))
- Creating a `MaintenanceOrder` executes an atomic transaction updating the vehicle's status to `MAINTENANCE`.
- This status prevents the vehicle from appearing in any dispatch recommendation.
- Updating the order to `COMPLETED` requires technician sign-off notes and immediately resets the vehicle's status to `AVAILABLE`.

### E. GPS Telematics Simulator ([`server/src/services/gpsSimulator.js`](file:///d:/ambulance/server/src/services/gpsSimulator.js))
Runs an asynchronous 5-second timer loop that steps through predefined Chennai road corridors (Anna Salai, Poonamallee High Road, Mount-Poonamallee, Guindy, Park Town). For each vehicle on an active trip:
1. Calculates intermediate coordinates along the corridor.
2. Updates `currentLatitude`, `currentLongitude`, and `odometerReading`.
3. Inserts a timestamped breadcrumb into `LocationHistory`.

### F. Real-DB Analytics Engine ([`server/src/services/analyticsService.js`](file:///d:/ambulance/server/src/services/analyticsService.js))
Calculates operations benchmarks dynamically via database queries:
- **Average Dispatch Speed:** `dispatchedAt - createdAt`.
- **Average Response Speed:** `arrivedPickupAt - dispatchedAt`.
- **Average Hospital Turnaround:** `handedOverAt - arrivedHospitalAt`.
- **Fleet Utilization:** Active trips divided by total fleet size.
- **Top Consumed Medical Items:** Aggregated sum of goods issue quantities.

---

## 4. Backend Middleware & Security (RBAC & Audit)

### Role-Based Access Control ([`server/src/middleware/auth.js`](file:///d:/ambulance/server/src/middleware/auth.js))
- **`authenticateJWT`:** Decodes and validates the bearer token from the `Authorization` header. Attaches `req.user` payload.
- **`authorizeRoles(...allowedRoles)`:** Validates whether the authenticated user's role exists within the allowed list. If unauthorized, returns `403 Forbidden: Insufficient permissions for role [ROLE]`.

### Immutable GRC Audit Logging ([`server/src/middleware/audit.js`](file:///d:/ambulance/server/src/middleware/audit.js))
Provides `logAudit(req, action, entityType, entityId, details)`:
- Extracts authenticated user ID, role, client IP address, action tag, and stringified JSON metadata.
- Appends an immutable record into SQLite table `AuditLog`.

### Security & Error Handling
- **Rate Limiting ([`server/src/middleware/rateLimiter.js`](file:///d:/ambulance/server/src/middleware/rateLimiter.js)):** Restricts authentication brute-force attempts (15 requests per 15 minutes) and general API floods (300 requests per 15 minutes).
- **Standardized Error Handler ([`server/src/middleware/errorHandler.js`](file:///d:/ambulance/server/src/middleware/errorHandler.js)):** Traps synchronous and asynchronous errors, formatting them into consistent `{ success: false, error: message }` responses.

---

## 5. Backend Controllers & API Routes

| Router File | Prefix | Primary Controller | Key Operations |
| :--- | :--- | :--- | :--- |
| `authRoutes.js` | `/api/auth` | `authController.js` | Login, issue JWT, retrieve profile (`/me`) |
| `emergencyRoutes.js` | `/api/emergency-cases` | `emergencyController.js` | Create case, run allocation, assign vehicle, dispatch, advance status |
| `ambulanceRoutes.js` | `/api/ambulances` | `ambulanceController.js` | Roster list, telematics coordinates update, registration |
| `employeeRoutes.js` | `/api/employees` | `employeeController.js` | Staff roster, skills query, enrollment |
| `hospitalRoutes.js` | `/api/hospitals` | `hospitalController.js` | Hospital list, department readiness status |
| `hospitalAlertRoutes.js` | `/api/hospital-alerts`| `hospitalController.js` | Create pre-alert, coordinator acknowledgment |
| `inventoryRoutes.js` | `/api/inventory` | `inventoryController.js` | Stock overview, goods issue (`/consume`), goods receipt (`/replenish`) |
| `maintenanceRoutes.js` | `/api/maintenance-orders`| `maintenanceController.js`| Create PM work order, sign-off & restore vehicle |
| `analyticsRoutes.js` | `/api/analytics` | `analyticsController.js` | Executive KPI cards and charts aggregation |
| `auditRoutes.js` | `/api/audit-logs` | `auditController.js` | GRC compliance audit query |
| `userRoutes.js` | `/api/users` | `userController.js` | Account provisioning and suspension (Admin only) |

---

## 6. Shortest Road Routing Engine (Dijkstra / OSRM)

Located in [`client/src/services/routingService.js`](file:///d:/ambulance/client/src/services/routingService.js) and integrated inside [`client/src/components/map/LiveMap.jsx`](file:///d:/ambulance/client/src/components/map/LiveMap.jsx):

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Ambulance (GPS) │       │ Patient Pickup  │       │ Target Hospital │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │  🔴 Shortest Road Route │  🟢 Shortest Road Route │
         └────────────────────────►│◄────────────────────────┘
                    (Dijkstra / Contraction Hierarchies)
```

### Real Road Network Geometry vs. Straight Lines
Instead of drawing direct diagonal lines across buildings and bodies of water:
1. Calls the **Open Source Routing Machine (OSRM)** driving API:
   `https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`
2. **Dijkstra & Contraction Hierarchies:** Computes the shortest driving path following actual road network arcs, turns, flyovers, and intersections across Chennai.
3. Maps GeoJSON `[longitude, latitude]` pairs into Leaflet's `[latitude, longitude]` array.
4. Returns exact road driving distance (in km) and travel duration (in minutes).
5. **In-Memory Caching:** Prevents redundant network calls by caching coordinate pairs rounded to ~10-meter accuracy.
6. **Graceful Road Grid Fallback:** If offline or if OSRM is throttled, generates an orthogonal Manhattan road grid path with intersection turns rather than a straight diagonal.

---

## 7. Frontend Architecture (React 18, Vite & Tailwind)

### Core Contexts & Networking
- **`AuthContext.jsx`:** Stores active user profile, JWT token in `localStorage`, and provides permission checkers (`hasRole(...)`). Includes a fast 1-click role switcher.
- **`NotificationContext.jsx`:** Polls `/api/notifications` every 10 seconds and manages UI toast alerts.
- **`client.js`:** Axios instance with an interceptor automatically injecting `Bearer <token>` headers into every outgoing request.

### Common Components
- **`Header.jsx`:** Displays AeroMed branding, active user pill, notification bell dropdown, and mobile navigation toggle.
- **`Sidebar.jsx`:** Role-filtered navigation menu and 1-click demo role switcher.
- **`StatusBadge.jsx`:** Standardized, high-contrast, accessible status badges for all case and fleet lifecycle states.
- **`LiveMap.jsx`:** Interactive Leaflet map container featuring animated custom SVG vehicle markers, hospital pins, and the **🔴 Red Line** and **🟢 Green Line** shortest road routing.

---

## 8. Client Pages & Operational Portals

1. **`Login.jsx`:** Secure login form with 7 one-click demo login buttons for each role.
2. **`Dashboard.jsx`:** Control-room command center featuring executive KPI cards, recent emergency calls, live mini telematics map, and operational response benchmarks.
3. **`CreateEmergency.jsx`:** Intake console with Chennai landmark presets (T. Nagar, Central Station, Guindy, etc.), clinical category selector, and the modal displaying rule-based allocation recommendations.
4. **`Emergencies.jsx`:** Filterable emergency incidents table with a detail inspection modal and hospital pre-alert trigger.
5. **`LiveTracking.jsx`:** Full-screen telematics console. Selecting any vehicle from the roster (e.g. `TN-01-EM-1001`) activates the shortest road routes on the map.
6. **`DriverPortal.jsx`:** Mobile-optimized driver cockpit enforcing sequential state machine buttons (`Accept Dispatch` $\rightarrow$ `Start Journey` $\rightarrow$ `Arrived at Scene` $\rightarrow$ `Patient Onboard` $\rightarrow$ `Arrived at Hospital` $\rightarrow$ `Confirm Handover`) and an onboard medical consumption form.
7. **`HospitalPortal.jsx`:** Hospital coordinator screen displaying incoming pre-alerts with trauma bay readiness controls.
8. **`Fleet.jsx`:** Vehicle management cards displaying fuel levels, odometer mileage, service dates, and vehicle registration.
9. **`Crew.jsx`:** Staff roster displaying clinical skill badges (CPR, ALS, Trauma), shifts, and staff enrollment.
10. **`Inventory.jsx`:** SAP MM material ledger showing stock levels per vehicle, low-stock warnings, goods issue (deduction), goods receipt (restocking), and transaction history.
11. **`Maintenance.jsx`:** SAP PM work order management. Creating an order automatically sets the vehicle to `MAINTENANCE`; signing off restores the vehicle to `AVAILABLE`.
12. **`Analytics.jsx`:** Recharts data visualizations showing emergency call distribution, fleet readiness, top-consumed supplies, and low-stock watchlists.
13. **`Users.jsx`:** Administrative user management for account provisioning and suspension.
14. **`AuditLogs.jsx`:** Chronological GRC audit trail with search and action filtering.

---

## 9. Automated Test Suite (21 Integration Tests)

Implemented in [`server/tests/api.test.js`](file:///d:/ambulance/server/tests/api.test.js) using **Jest** and **Supertest**:

```
PASS tests/api.test.js
  AeroMed Emergency Fleet Management - API Test Suite
    1. Authentication & Role-Based Access Control
      ✓ rejects login with invalid password
      ✓ authenticates operator successfully with valid credentials
      ✓ authenticates admin successfully
      ✓ authenticates driver successfully
      ✓ authenticates hospital coordinator successfully
      ✓ rejects driver attempting operator-only emergency case creation (RBAC 403)
    2. Emergency Case Lifecycle & Allocation Engine
      ✓ creates emergency case with auto-generated caseNumber (EMG-YYYY-NNNN)
      ✓ assigns recommended ambulance and crew to the case
      ✓ rejects invalid status jump (e.g. jumping from ASSIGNED directly to AT_PICKUP)
      ✓ dispatches ambulance and transitions status to DISPATCHED
      ✓ progresses through valid dispatch lifecycle stages
    3. Hospital Pre-Alert & Coordination
      ✓ creates hospital pre-alert for receiving emergency department
      ✓ allows hospital coordinator to acknowledge the pre-alert
    4. Medical Inventory (SAP MM) & Negative Stock Prevention
      ✓ rejects material consumption that exceeds available stock (negative-stock prevention)
      ✓ successfully consumes valid stock quantity and records material ledger transaction
    5. Fleet Maintenance (SAP PM)
      ✓ creates maintenance order and automatically sets vehicle status to MAINTENANCE
      ✓ completes maintenance order and restores vehicle status to AVAILABLE
    6. Handover, Closure & Analytics Verification
      ✓ progresses case to ARRIVED_AT_HOSPITAL and HANDED_OVER
      ✓ closes emergency case and releases vehicle and crew to AVAILABLE
      ✓ returns calculated real-time analytics with non-zero metrics
      ✓ verifies audit log captured all lifecycle events
```

---

## 10. End-to-End Emergency Incident Lifecycle Walkthrough

```
1. CALL INTAKE (Operator):
   Caller dials in with suspected cardiac arrest at Panagal Park, T. Nagar.
   Operator enters details in "Create Emergency" and marks as P1 Critical.
   └──► System generates case number "EMG-2026-0011".

2. RULE-BASED ALLOCATION ENGINE:
   Evaluates available fleet. Excludes TN-03-EM-3001 (in Maintenance).
   Computes Haversine distance, ALS grade suitability, on-duty crew, and oxygen/AED readiness.
   └──► Recommends TN-01-EM-1001 with 92% composite suitability.

3. DISPATCH ASSIGNMENT:
   Operator confirms recommendation.
   Case status transitions: OPEN ──► ASSIGNED.
   Ambulance status updates: AVAILABLE ──► ASSIGNED.
   Driver and Paramedic marked: AVAILABLE ──► ASSIGNED.

4. VEHICLE LAUNCH:
   Driver accepts dispatch.
   Case status transitions: ASSIGNED ──► DISPATCHED.
   Ambulance status updates: ASSIGNED ──► ON_TRIP.
   Live telematics simulator starts streaming 5-second coordinates.
   Map traces 🔴 Shortest Road Route from ambulance to patient.

5. HOSPITAL PRE-ALERT TRANSMISSION:
   Operator or Medic sends pre-alert to Apollo Hospital Greams Road.
   Coordinator receives notification and clicks "Acknowledge & Prepare Trauma Bay".
   Map traces 🟢 Shortest Road Route from patient to hospital.

6. PATIENT ENCOUNTER & IN-TRANSIT CLINICAL CARE:
   Ambulance arrives at scene: DISPATCHED ──► EN_ROUTE_TO_PICKUP ──► AT_PICKUP.
   Patient loaded: AT_PICKUP ──► EN_ROUTE_TO_HOSPITAL.
   Medic administers 1 Oxygen Cylinder in transit.
   Medic enters Goods Issue in Driver Portal:
   └──► Stock reduces from 4 to 3; InventoryTransaction recorded.

7. HOSPITAL ARRIVAL & CLINICAL HANDOVER:
   Ambulance reaches facility: ARRIVED_AT_HOSPITAL ──► HANDED_OVER.
   Receiving physician signs off handover.

8. MISSION CLOSURE & RESOURCE RECOVERY:
   Operator or Driver marks case as CLOSED.
   Ambulance TN-01-EM-1001 automatically resets to AVAILABLE.
   Driver and Paramedic automatically reset to AVAILABLE.
   AuditLog records complete transaction chain.
   Analytics dashboard updates dispatch and response metrics.
```
