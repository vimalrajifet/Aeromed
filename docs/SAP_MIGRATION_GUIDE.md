# SAP Enterprise Migration Guide: AeroMed to SAP CAP & SAP BTP

This document provides a blueprint for migrating the **AeroMed Emergency Fleet Management** prototype from the local React/Node.js/SQLite architecture into an enterprise-grade SAP landscape utilizing **SAP Cloud Application Programming Model (CAP)**, **SAP HANA Cloud**, **SAP BTP (Business Technology Platform)**, and **SAP Fiori / SAPUI5**.

---

## 1. Architectural Transformation Overview

```
LOCAL PROTOTYPE (Current)                         ENTERPRISE SAP LANDSCAPE (Target)
------------------------                         ---------------------------------
React 18 + Tailwind CSS               ───►       SAP Fiori Elements (Floorplans) / SAPUI5 (Freestyle)
Node.js + Express API Layer           ───►       SAP Cloud Application Programming (CAP) Node.js (@sap/cds)
Prisma ORM + Local SQLite             ───►       SAP HANA Cloud (Columnar DB with Spatial Engine)
In-memory GPS Telematics & Polling    ───►       SAP Internet of Things (IoT) / SAP Event Mesh
Custom JWT & In-Memory RBAC           ───►       SAP Cloud Identity Services (IAS) & XSUAA
AuditLog in SQLite Table              ───►       SAP Cloud Logging & SAP Audit Log Service
```

---

## 2. Data Layer Migration: Prisma to SAP Core Data Services (CDS)

The 14 Prisma models map directly to Core Data Services (CDS) definitions in SAP CAP (`db/schema.cds`).

### Sample CDS Schema (`db/schema.cds`):
```cds
namespace aeromed.fleet;

using { cuid, managed } from '@sap/cds/common';

entity EmergencyCases : cuid, managed {
  caseNumber            : String(20) @assert.unique;
  callerName            : String(100);
  callerPhone           : String(20);
  emergencyType         : String(30); // CARDIAC, TRAUMA, STROKE...
  priority              : String(20); // P1_CRITICAL, P2_HIGH...
  description           : LargeString;
  pickupAddress         : String(255);
  pickupLocation        : GeoPoint; // Native SAP HANA ST_POINT
  destinationHospital   : Association to Hospitals;
  assignedAmbulance     : Association to Ambulances;
  status                : String(20) default 'OPEN';
  dispatchedAt          : Timestamp;
  arrivedAt             : Timestamp;
  completedAt           : Timestamp;
  crewAssignments       : Composition of many CrewAssignments on crewAssignments.emergencyCase = $self;
  hospitalAlerts        : Composition of many HospitalAlerts on hospitalAlerts.emergencyCase = $self;
}

entity Ambulances : cuid, managed {
  registrationNumber    : String(20) @assert.unique;
  ambulanceType         : String(20); // ALS, BLS, PTS
  currentLocation       : GeoPoint;   // Native SAP HANA Spatial coordinate
  fuelLevel             : Decimal(5,2);
  status                : String(20) default 'AVAILABLE';
  odometerReading       : Decimal(10,2);
  lastServiceDate       : Date;
  nextServiceDate       : Date;
  inventory             : Composition of many AmbulanceInventories on inventory.ambulance = $self;
  maintenanceOrders     : Association to many MaintenanceOrders on maintenanceOrders.ambulance = $self;
}

entity Hospitals : cuid, managed {
  name                  : String(150);
  address               : String(255);
  location              : GeoPoint;
  contactNumber         : String(20);
  availableDepartments  : LargeString;
  availabilityStatus    : String(20) default 'ACCEPTING';
}

entity MedicalItems : cuid, managed {
  itemCode              : String(30) @assert.unique;
  name                  : String(100);
  category              : String(30);
  unit                  : String(10);
  minimumQuantity       : Integer default 5;
  expiryControlled      : Boolean default false;
}

entity AmbulanceInventories : cuid, managed {
  ambulance             : Association to Ambulances;
  medicalItem           : Association to MedicalItems;
  availableQuantity     : Integer default 0;
  expiryDate            : Date;
}

entity MaintenanceOrders : cuid, managed {
  orderNumber           : String(30) @assert.unique;
  ambulance             : Association to Ambulances;
  maintenanceType       : String(30);
  issueDescription      : LargeString;
  priority              : String(20);
  scheduledDate         : Date;
  completedDate         : Date;
  status                : String(20) default 'PENDING';
  technicianNotes       : LargeString;
}
```

---

## 3. Native Spatial Operations with SAP HANA Cloud

In the prototype, distance is computed via a JavaScript Haversine formula.
In SAP HANA Cloud, spatial calculations can utilize native high-performance spatial SQL:

```sql
SELECT
  a.registrationNumber,
  a.currentLocation.ST_Distance(ST_GeomFromText('POINT(80.2341 13.0418)', 4326), 'kilometer') AS distanceKm
FROM aeromed_fleet_Ambulances AS a
WHERE a.status = 'AVAILABLE'
ORDER BY distanceKm ASC;
```

This offloads distance sorting directly to the in-memory SAP HANA columnar engine.

---

## 4. Service Layer: CAP Service Definition (`srv/dispatch-service.cds`)

```cds
using { aeromed.fleet as fleet } from '../db/schema';

service DispatchService @(path:'/api/dispatch') @(requires: 'authenticated-user') {
  
  @readonly entity Hospitals as projection on fleet.Hospitals;
  
  entity EmergencyCases as projection on fleet.EmergencyCases actions {
    @(requires: 'Operator')
    action recommendAmbulance() returns array of fleet.Ambulances;
    
    @(requires: 'Operator')
    action assignAmbulance(ambulanceId: UUID, driverId: UUID, paramedicId: UUID);
    
    @(requires: ['Operator', 'Driver'])
    action dispatch();
    
    @(requires: ['Driver', 'Operator'])
    action updateStatus(nextStatus: String, notes: String);
  };

  entity Ambulances as projection on fleet.Ambulances;
  entity MaintenanceOrders as projection on fleet.MaintenanceOrders;
  entity MedicalInventory as projection on fleet.AmbulanceInventories actions {
    @(requires: ['Driver', 'Paramedic'])
    action consumeStock(quantity: Integer, remarks: String);
  };
}
```

### Event Handlers in SAP CAP (`srv/dispatch-service.js`):
```javascript
const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {
  const { EmergencyCases, Ambulances, MaintenanceOrders } = this.entities;

  // Enforce maintenance status locking upon Work Order creation
  this.after('CREATE', MaintenanceOrders, async (order) => {
    await UPDATE(Ambulances).set({ status: 'MAINTENANCE' }).where({ ID: order.ambulance_ID });
  });

  // Restore vehicle status when Work Order completes
  this.after('UPDATE', MaintenanceOrders, async (order) => {
    if (order.status === 'COMPLETED') {
      await UPDATE(Ambulances).set({ status: 'AVAILABLE' }).where({ ID: order.ambulance_ID });
    }
  });
});
```

---

## 5. User Roles Mapping to SAP BTP Role Collections

| AeroMed Role | SAP BTP Role Collection | SAP Fiori Tile / Catalog |
| :--- | :--- | :--- |
| **Administrator** | `AeroMed_SystemAdmin` | System Administration & Audit |
| **Control-Room Operator** | `AeroMed_Dispatcher` | Emergency Dispatch Console |
| **Ambulance Driver** | `AeroMed_FieldCrew` | SAP Mobile Services / Driver PWA |
| **Medical Team** | `AeroMed_ClinicalTeam` | Clinical Handover & Supplies App |
| **Hospital Coordinator** | `AeroMed_HospitalCoord` | Pre-Alert Intake & Bed Allocation |
| **Fleet Manager** | `AeroMed_FleetManager` | Fleet Assets & SAP PM Integration |
| **Inventory Manager** | `AeroMed_MaterialsManager` | Stock Overview & SAP MM Movements |

---

## 6. Frontend: Migration to SAP Fiori Elements

The React components can be migrated directly to standard SAP Fiori floorplans:
- **Emergency Case List:** Fiori List Report Object Page (LROP) Floorplan.
- **Control Room Dashboard:** SAP Fiori Overview Page (OVP) with Analytical Cards.
- **Driver Portal:** SAP Fiori Mobile Freestyle App via SAP Mobile Services.
- **Analytics:** SAP Analytics Cloud (SAC) embedded live connection to SAP HANA Cloud views.
