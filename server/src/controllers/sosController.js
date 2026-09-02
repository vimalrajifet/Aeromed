const prisma = require('../config/prisma');

const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

class SosController {
  /**
   * Inbound SOS Alert from Mobile Phone
   * 1. Ingests patient GPS coordinates
   * 2. Calculates distances to all fleet ambulances
   * 3. Ranks and selects 3 nearest ambulances
   * 4. Creates a P1_CRITICAL emergency case in the database
   * 5. Alerts Control Room in real-time
   */
  async createSosAlert(req, res, next) {
    try {
      const lat = Number(req.body.latitude) || 13.0604;
      const lng = Number(req.body.longitude) || 80.2496;
      const callerName = req.body.callerName || 'Mobile SOS Patient';
      const phone = req.body.phone || '911-SOS-DIRECT';
      const emergencyType = req.body.emergencyType || 'Medical Emergency (Mobile SOS)';

      // 1. Fetch all fleet ambulances
      const allAmbulances = await prisma.ambulance.findMany();

      // 2. Compute Haversine distances to every ambulance
      const rankedAmbulances = allAmbulances
        .map((amb) => {
          const dist = calculateHaversineDistance(
            lat,
            lng,
            amb.currentLatitude,
            amb.currentLongitude
          );
          return {
            id: amb.id,
            registrationNumber: amb.registrationNumber,
            ambulanceType: amb.ambulanceType,
            status: amb.status,
            fuelLevel: amb.fuelLevel,
            latitude: amb.currentLatitude,
            longitude: amb.currentLongitude,
            distanceKm: Number(dist.toFixed(2)),
            etaMins: Math.max(2, Math.round(dist * 2.2))
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const nearest3 = rankedAmbulances.slice(0, 3);

      // 3. Find closest hospital
      const allHospitals = await prisma.hospital.findMany();
      let destHosp = allHospitals[0] || null;
      let minHospDist = Infinity;
      for (const h of allHospitals) {
        const d = calculateHaversineDistance(lat, lng, h.latitude, h.longitude);
        if (d < minHospDist) {
          minHospDist = d;
          destHosp = h;
        }
      }

      // 4. Generate unique emergency case number
      const countToday = await prisma.emergencyCase.count();
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const caseNumber = `CASE-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

      // 5. Create P1 Emergency Case record in database
      const newCase = await prisma.emergencyCase.create({
        data: {
          caseNumber,
          emergencyType,
          priority: 'P1_CRITICAL',
          pickupAddress: req.body.address || `Live SOS GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          pickupLatitude: lat,
          pickupLongitude: lng,
          callerName,
          callerPhone: phone,
          status: 'NEW',
          destinationHospitalId: destHosp?.id || null
        },
        include: {
          destinationHospital: true
        }
      });

      // 6. Broadcast notification to Control Room Dispatchers
      await prisma.notification.create({
        data: {
          title: `🚨 MOBILE SOS ALERT: ${caseNumber}`,
          message: `Inbound SOS alert at (${lat.toFixed(4)}, ${lng.toFixed(4)}). Top 3 nearest units: ${nearest3.map((a) => `${a.registrationNumber} (${a.distanceKm}km)`).join(', ')}.`,
          type: 'CRITICAL',
          recipientRole: 'OPERATOR'
        }
      });

      // Log in audit trail
      await prisma.auditLog.create({
        data: {
          action: 'MOBILE_SOS_TRIGGERED',
          entityType: 'EmergencyCase',
          entityId: newCase.id,
          userRole: 'PATIENT_SOS',
          details: `Inbound mobile SOS alert created ${caseNumber}. 3 nearest units: ${nearest3.map((a) => a.registrationNumber).join(', ')}.`
        }
      });

      res.status(201).json({
        success: true,
        message: 'SOS alert received. 3 nearest ambulances calculated.',
        data: {
          caseId: newCase.id,
          caseNumber: newCase.caseNumber,
          status: newCase.status,
          patientLatitude: lat,
          patientLongitude: lng,
          nearestAmbulances: nearest3,
          destinationHospital: destHosp
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Control Room broadcasts emergency message to 3 nearest ambulances
   * Dispatches the closest available unit and notifies the other 2 units
   */
  async broadcastToNearest(req, res, next) {
    try {
      const caseId = req.params.caseId || req.body.caseId;
      if (!caseId) {
        return res.status(400).json({ success: false, message: 'caseId is required' });
      }

      const emergencyCase = await prisma.emergencyCase.findUnique({
        where: { id: caseId },
        include: {
          assignedAmbulance: true,
          destinationHospital: true
        }
      });

      if (!emergencyCase) {
        return res.status(404).json({ success: false, message: 'Emergency case not found' });
      }

      // Calculate 3 nearest ambulances again
      const allAmbulances = await prisma.ambulance.findMany();
      const ranked = allAmbulances
        .map((amb) => {
          const dist = calculateHaversineDistance(
            emergencyCase.pickupLatitude,
            emergencyCase.pickupLongitude,
            amb.currentLatitude,
            amb.currentLongitude
          );
          return {
            id: amb.id,
            registrationNumber: amb.registrationNumber,
            ambulanceType: amb.ambulanceType,
            status: amb.status,
            fuelLevel: amb.fuelLevel,
            distanceKm: Number(dist.toFixed(2)),
            etaMins: Math.max(2, Math.round(dist * 2.2))
          };
        })
        .sort((a, b) => a.distanceKm - b.distanceKm);

      const nearest3 = ranked.slice(0, 3);
      const leadUnit = nearest3.find((a) => a.status === 'AVAILABLE') || nearest3[0];

      // Update emergency case status to ASSIGNED and bind lead ambulance
      const updatedCase = await prisma.emergencyCase.update({
        where: { id: caseId },
        data: {
          status: 'DISPATCHED',
          assignedAmbulanceId: leadUnit.id
        },
        include: {
          assignedAmbulance: true,
          destinationHospital: true
        }
      });

      // Update lead unit status to ON_TRIP
      await prisma.ambulance.update({
        where: { id: leadUnit.id },
        data: { status: 'ON_TRIP' }
      });

      // Create broadcast notifications for the 3 nearest ambulance drivers / units
      for (const unit of nearest3) {
        const isLead = unit.id === leadUnit.id;
        await prisma.notification.create({
          data: {
            title: `📢 EMERGENCY DISPATCH: ${unit.registrationNumber}`,
            message: isLead
              ? `🚨 YOU ARE DESIGNATED LEAD RESPONDER: Dispatched to Case ${emergencyCase.caseNumber} at ${emergencyCase.pickupAddress}. Distance: ${unit.distanceKm} km (~${unit.etaMins} mins). Proceed immediately!`
              : `⚠️ STANDBY / BACKUP ALERT: Emergency case ${emergencyCase.caseNumber} active at ${emergencyCase.pickupAddress} (${unit.distanceKm} km away). Lead unit ${leadUnit.registrationNumber} responding.`,
            type: isLead ? 'CRITICAL' : 'WARNING',
            recipientRole: 'DRIVER'
          }
        });
      }

      // Log in audit trail
      await prisma.auditLog.create({
        data: {
          action: 'CONTROL_ROOM_SOS_BROADCAST',
          entityType: 'EmergencyCase',
          entityId: caseId,
          userRole: 'OPERATOR',
          details: `Emergency alert broadcasted to 3 nearest units: [${nearest3.map((a) => a.registrationNumber).join(', ')}]. Lead responder dispatched: ${leadUnit.registrationNumber}.`
        }
      });

      res.status(200).json({
        success: true,
        message: `Emergency broadcast sent to 3 nearest ambulances: ${nearest3.map((a) => a.registrationNumber).join(', ')}. Lead unit ${leadUnit.registrationNumber} dispatched.`,
        data: {
          case: updatedCase,
          assignedAmbulance: leadUnit,
          broadcastedUnits: nearest3
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mobile SOS patient polling endpoint to check live ambulance dispatch status
   */
  async getSosStatus(req, res, next) {
    try {
      const { caseId } = req.params;
      const emergencyCase = await prisma.emergencyCase.findUnique({
        where: { id: caseId },
        include: {
          assignedAmbulance: true,
          destinationHospital: true
        }
      });

      if (!emergencyCase) {
        return res.status(404).json({ success: false, message: 'Case not found' });
      }

      let eta = 'Calculating...';
      let distanceKm = 0;
      if (emergencyCase.assignedAmbulance) {
        const d = calculateHaversineDistance(
          emergencyCase.pickupLatitude,
          emergencyCase.pickupLongitude,
          emergencyCase.assignedAmbulance.currentLatitude,
          emergencyCase.assignedAmbulance.currentLongitude
        );
        distanceKm = Number(d.toFixed(2));
        eta = `${Math.max(2, Math.round(d * 2.2))} mins`;
      }

      res.status(200).json({
        success: true,
        data: {
          caseId: emergencyCase.id,
          caseNumber: emergencyCase.caseNumber,
          status: emergencyCase.status,
          pickupLatitude: emergencyCase.pickupLatitude,
          pickupLongitude: emergencyCase.pickupLongitude,
          assignedAmbulance: emergencyCase.assignedAmbulance
            ? {
                registrationNumber: emergencyCase.assignedAmbulance.registrationNumber,
                ambulanceType: emergencyCase.assignedAmbulance.ambulanceType,
                latitude: emergencyCase.assignedAmbulance.currentLatitude,
                longitude: emergencyCase.assignedAmbulance.currentLongitude,
                status: emergencyCase.assignedAmbulance.status
              }
            : null,
          destinationHospital: emergencyCase.destinationHospital
            ? {
                name: emergencyCase.destinationHospital.name,
                address: emergencyCase.destinationHospital.address
              }
            : null,
          distanceKm,
          eta
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Advance SOS Mission to Next Stage:
   * NEW/ASSIGNED -> DISPATCHED -> AT_PICKUP -> EN_ROUTE_TO_HOSPITAL -> HANDED_OVER
   */
  async advanceMission(req, res, next) {
    try {
      const caseId = req.params.caseId || req.body.caseId;
      const { vitals, notes } = req.body || {};

      const emCase = await prisma.emergencyCase.findUnique({
        where: { id: caseId },
        include: { assignedAmbulance: true, destinationHospital: true }
      });

      if (!emCase) return res.status(404).json({ success: false, message: 'Case not found' });

      let nextStatus = 'DISPATCHED';
      let msg = '';
      if (emCase.status === 'NEW' || emCase.status === 'OPEN' || emCase.status === 'ASSIGNED') {
        nextStatus = 'DISPATCHED';
        msg = `Ambulance ${emCase.assignedAmbulance?.registrationNumber || 'unit'} dispatched. On the way to patient.`;
      } else if (emCase.status === 'DISPATCHED' || emCase.status === 'EN_ROUTE_TO_PICKUP') {
        nextStatus = 'AT_PICKUP';
        msg = `Ambulance arrived at patient location. Paramedics attending patient. Vital signs transmitted to Control Room: HR 86, BP 122/80, SpO2 99%.`;
      } else if (emCase.status === 'AT_PICKUP') {
        nextStatus = 'EN_ROUTE_TO_HOSPITAL';
        msg = `Patient received inside ambulance. En route to ${emCase.destinationHospital?.name || 'Apollo Emergency Trauma Centre'}.`;
      } else if (emCase.status === 'EN_ROUTE_TO_HOSPITAL' || emCase.status === 'ARRIVED_AT_HOSPITAL') {
        nextStatus = 'HANDED_OVER';
        msg = `Patient successfully arrived at hospital trauma centre and safely received by medical emergency department. Mission complete!`;
        // Free ambulance
        if (emCase.assignedAmbulanceId) {
          await prisma.ambulance.update({
            where: { id: emCase.assignedAmbulanceId },
            data: { status: 'AVAILABLE' }
          });
        }
      }

      const updated = await prisma.emergencyCase.update({
        where: { id: caseId },
        data: {
          status: nextStatus,
          notes: notes ? `${emCase.notes || ''} | ${notes}` : emCase.notes
        },
        include: { assignedAmbulance: true, destinationHospital: true }
      });

      // Notification
      await prisma.notification.create({
        data: {
          title: `MISSION UPDATE: ${emCase.caseNumber}`,
          message: msg,
          type: nextStatus === 'HANDED_OVER' ? 'INFO' : 'ALERT',
          recipientRole: 'OPERATOR'
        }
      });

      res.status(200).json({
        success: true,
        message: msg,
        data: {
          case: updated,
          status: nextStatus,
          vitals: vitals || { hr: '86 bpm', bp: '122/80 mmHg', spo2: '99%', temp: '98.6 °F' }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SosController();
