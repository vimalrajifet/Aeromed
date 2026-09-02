# AeroMed Emergency Fleet Management — SAP Architecture MVP

> **Educational Prototype Notice:** This software is a student-level architectural prototype designed for educational demonstration only. It uses fictional demonstration data (Chennai, Tamil Nadu context). Do **not** represent or use this system as a certified medical, emergency dispatch, or traffic-control system.

---

## 🚑 Project Overview

**AeroMed Emergency Fleet Management** is an enterprise-modeled emergency fleet and dispatch application. It incorporates core business flows inspired by SAP modules:

- **SAP Transportation Management / S/4HANA Service:** Emergency intake, rule-based vehicle allocation, live telematics dispatch tracking, and hospital handover.
- **SAP Plant Maintenance (PM):** Fleet work orders (`WO-2026-XXX`), scheduled quarterly servicing, breakdown maintenance, and automatic vehicle downtime locking.
- **SAP Materials Management (MM):** Ambulance onboard medical inventory, consumption logging (goods issue), negative-stock prevention, minimum threshold alerts, and restocking (goods receipt).
- **SAP HCM / SuccessFactors:** Crew rosters, shifts, paramedic and emergency driver skill matrices, and active incident assignment.
- **SAP Event Mesh / BTP Alerting:** Pre-alert transmissions to hospital trauma receiving bays with coordinator acknowledgment workflows.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Mapping & Telematics** | Leaflet, React-Leaflet, OpenStreetMap |
| **Data Visualization** | Recharts (dynamic database aggregation) |
| **Backend** | Node.js, Express (REST API, Clean Modular Services) |
| **Database** | SQLite, Prisma ORM 5.22.0 |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs password hashing, Rate Limiting |
| **Testing** | Jest, Supertest (21 automated integration tests) |
| **Architecture** | Service-Layer Architecture prepared for SAP CAP & SAP HANA Cloud |

> 📖 **Deep Dive Documentation:**
> - [FULL_CODEBASE_EXPLANATION.md](file:///d:/ambulance/docs/FULL_CODEBASE_EXPLANATION.md) — Comprehensive architecture, data models, services, and algorithms guide.
> - [VERCEL_DEPLOYMENT_GUIDE.md](file:///d:/ambulance/docs/VERCEL_DEPLOYMENT_GUIDE.md) — Step-by-step instructions to deploy to Vercel via CLI or GitHub.
> - [SAP_MIGRATION_GUIDE.md](file:///d:/ambulance/docs/SAP_MIGRATION_GUIDE.md) — Architecture guide for migrating to SAP BTP, CAP, and HANA Cloud.

---

## 👥 User Roles & Demo Credentials

Every main user role has a pre-configured account with fictional credentials for local evaluation:

| Role | Username | Password | Purpose & Screen Access |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full administrative control, user provisioning, compliance audits |
| **Control-Room Operator** | `operator` | `aeromed123` | Call intake, rule-based allocation engine, dispatch confirmation |
| **Ambulance Driver** | `driver1` | `aeromed123` | Mobile sequential journey portal (`DISPATCHED` → `HANDED_OVER`) |
| **Medical Team Member** | `paramedic1` | `aeromed123` | Clinical patient care and supply consumption |
| **Hospital Coordinator** | `hospital_coord` | `aeromed123` | Trauma bay pre-alert reception, acknowledgment, and bay prep |
| **Fleet Manager** | `fleet_mgr` | `aeromed123` | Vehicle registry, SAP PM maintenance work orders, status locking |
| **Inventory Manager** | `inventory_mgr` | `aeromed123` | SAP MM medical supply catalog, stock thresholds, replenishment |

*Note: The frontend includes a **Fast Role Switcher** at the bottom of the sidebar for 1-click evaluation without re-typing credentials.*

---

## ⚙️ Quick Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+)

### 1. Install Backend & Frontend Dependencies
From the repository root `d:\ambulance`:
```powershell
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 2. Configure Environment Variables
Backend configuration is provided in `server/.env`:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=aeromed_super_secret_jwt_key_chennai_2026
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
```

### 3. Initialize Database & Seed Demo Data
```powershell
cd d:\ambulance\server
npx prisma db push
node prisma/seed.js
```

This seeds:
- 5 Ambulances (Tamil Nadu registrations: `TN-01-EM-1001` through `TN-03-EM-3001`)
- 10 Employees (Drivers, Doctors, Paramedics, EMTs with shifts and skills)
- 4 Chennai Hospitals (Apollo Greams Rd, Rajiv Gandhi General, MIOT, Fortis Malar)
- 15 SAP MM Medical Items (Oxygen cylinders, AED pads, IV cannula, pharmaceuticals)
- 6 Maintenance Records (SAP PM)
- 10 Historical Emergency Incidents

---

## 🚀 Running the Application

To run both backend (Port `5000`) and frontend (Port `5173`) concurrently:
```powershell
cd d:\ambulance
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

---

## 🧪 Automated Testing

Run the full integration test suite (21 tests covering Auth, Allocation, Dispatch, Pre-Alert, Inventory, and Maintenance):
```powershell
cd d:\ambulance\server
npm test
```

### Test Coverage Summary:
- ✅ Role-based authentication and token generation
- ✅ RBAC endpoint protection (Drivers cannot create emergency calls)
- ✅ Sequential Case Number generation (`EMG-2026-XXXX`)
- ✅ Rule-based allocation scoring (Haversine formula + suitability)
- ✅ Exclusion of maintenance vehicles from allocation recommendations
- ✅ Prevention of invalid status transitions (cannot skip steps)
- ✅ Dispatch state changes (`ASSIGNED` → `DISPATCHED`, vehicle status switches to `ON_TRIP`)
- ✅ Hospital Pre-Alert creation and coordinator acknowledgment
- ✅ Material consumption (SAP MM Goods Issue) with strict negative-stock prevention
- ✅ Maintenance work order creation (automatically sets status to `MAINTENANCE`)
- ✅ Work order completion (restores vehicle status to `AVAILABLE`)
- ✅ Dynamic analytics computation from real SQLite database records
- ✅ Immutable audit trail verification

---

## 🧠 Rule-Based Allocation Engine

The allocation engine is strictly rule-based and transparent:
1. **Filter:** Retrieves ambulances with `status = 'AVAILABLE'` (strictly excludes `MAINTENANCE` and `OFFLINE`).
2. **Haversine Distance (40% Weight):** Calculates Great-Circle distance to pickup coordinates:
   $$d = 2 R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
3. **Vehicle Type Suitability (25% Weight):** Evaluates medical urgency (e.g. ALS required for P1 Critical / Cardiac).
4. **Crew Availability (20% Weight):** Matches available on-duty driver and specialized paramedic/doctor.
5. **Onboard Equipment (15% Weight):** Checks available oxygen cylinders and AED pads against safety minimums.
6. **Overall Score:**
   $$\text{Total Score} = (0.40 \times \text{Distance}) + (0.25 \times \text{Type}) + (0.20 \times \text{Crew}) + (0.15 \times \text{Equipment})$$

---

## 📡 Simulated Live GPS Telematics

The GPS telematics engine emits coordinates every 5 seconds along sample Chennai road corridors (Greams Road, Anna Salai, Guindy, Park Town, Adyar). Coordinates and instantaneous vehicle speeds are recorded in `LocationHistory` and reflected dynamically on the interactive Leaflet map.

---

## 🗺️ REST API Endpoints

| Method | Endpoint | Description | Protected Roles |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and issue JWT | Public (Rate Limited) |
| `GET` | `/api/auth/me` | Current user profile | All authenticated |
| `GET` | `/api/emergency-cases` | List cases with filters | All authenticated |
| `POST` | `/api/emergency-cases` | Create new emergency case | Operator, Admin |
| `POST` | `/api/emergency-cases/:id/assign` | Assign ambulance & crew | Operator, Admin |
| `POST` | `/api/emergency-cases/:id/dispatch` | Confirm vehicle dispatch | Operator, Driver, Admin |
| `PATCH` | `/api/emergency-cases/:id/status` | Advance lifecycle status | Operator, Driver, Medic, Admin |
| `GET` | `/api/ambulances` | Fleet roster & status | All authenticated |
| `PATCH` | `/api/ambulances/:id/location` | Telematics location update | Operator, Driver, Fleet, Admin |
| `GET` | `/api/hospitals` | Trauma centers & departments | All authenticated |
| `POST` | `/api/hospital-alerts` | Transmit inbound pre-alert | Operator, Driver, Medic, Admin |
| `PATCH` | `/api/hospital-alerts/:id/acknowledge` | Acknowledge/Reject bay alert | Hospital Coordinator, Admin |
| `GET` | `/api/inventory` | Ambulance stock levels | All authenticated |
| `POST` | `/api/inventory/consume` | Deduct consumed medical items | Driver, Medic, Operator, Admin |
| `POST` | `/api/inventory/replenish` | Restock warehouse quantities | Inventory Mgr, Fleet Mgr, Admin |
| `GET` | `/api/maintenance-orders` | List maintenance work orders | All authenticated |
| `POST` | `/api/maintenance-orders` | Generate PM work order | Fleet Mgr, Driver, Admin |
| `PATCH` | `/api/maintenance-orders/:id` | Sign off & close work order | Fleet Mgr, Admin |
| `GET` | `/api/analytics` | Aggregated operations KPIs | All authenticated |
| `GET` | `/api/audit-logs` | Chronological GRC audit trail | Admin, Operator, Fleet Mgr |

---

## ⚠️ Known Limitations & Educational Disclaimer
- Built with local SQLite database for rapid zero-dependency demonstration.
- GPS telematics is simulated programmatically; it does not connect to municipal GPS satellites or traffic authorities.
- Clinical recommendations and prioritization are rule-based scoring models for academic demonstration.
