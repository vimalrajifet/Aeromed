const prisma = require('../config/prisma');
const { logAudit } = require('../middleware/audit');

class AmbulanceController {
  async getAllAmbulances(req, res, next) {
    try {
      const { status, type } = req.query;
      const where = {};
      if (status && status !== 'ALL') where.status = status;
      if (type && type !== 'ALL') where.ambulanceType = type;

      const ambulances = await prisma.ambulance.findMany({
        where,
        include: {
          inventory: {
            include: { medicalItem: true }
          },
          crewAssignments: {
            where: { releasedAt: null },
            include: { employee: true }
          },
          assignedCases: {
            where: {
              status: { notIn: ['CLOSED', 'CANCELLED'] }
            }
          }
        },
        orderBy: { registrationNumber: 'asc' }
      });

      res.status(200).json({ success: true, data: ambulances });
    } catch (error) {
      next(error);
    }
  }

  async getAmbulanceById(req, res, next) {
    try {
      const { id } = req.params;
      const ambulance = await prisma.ambulance.findUnique({
        where: { id },
        include: {
          inventory: {
            include: { medicalItem: true }
          },
          crewAssignments: {
            include: { employee: true },
            orderBy: { assignedAt: 'desc' },
            take: 10
          },
          maintenanceOrders: {
            orderBy: { createdAt: 'desc' }
          },
          locationHistory: {
            orderBy: { recordedAt: 'desc' },
            take: 30
          }
        }
      });

      if (!ambulance) {
        return res.status(404).json({ success: false, error: 'Ambulance not found' });
      }

      res.status(200).json({ success: true, data: ambulance });
    } catch (error) {
      next(error);
    }
  }

  async createAmbulance(req, res, next) {
    try {
      const { registrationNumber, ambulanceType, currentLatitude, currentLongitude, fuelLevel, odometerReading } = req.body;

      if (!registrationNumber || !ambulanceType) {
        return res.status(400).json({ success: false, error: 'Registration number and ambulance type are required' });
      }

      const ambulance = await prisma.ambulance.create({
        data: {
          registrationNumber: registrationNumber.trim().toUpperCase(),
          ambulanceType,
          currentLatitude: currentLatitude ? parseFloat(currentLatitude) : 13.0604,
          currentLongitude: currentLongitude ? parseFloat(currentLongitude) : 80.2496,
          fuelLevel: fuelLevel ? parseFloat(fuelLevel) : 100.0,
          odometerReading: odometerReading ? parseFloat(odometerReading) : 0.0,
          status: 'AVAILABLE'
        }
      });

      const ipAddress = req.ip || req.connection.remoteAddress;
      await logAudit({
        userId: req.user?.id,
        userRole: req.user?.role,
        action: 'AMBULANCE_CREATED',
        entityType: 'Ambulance',
        entityId: ambulance.id,
        details: { registrationNumber: ambulance.registrationNumber, type: ambulance.ambulanceType },
        ipAddress
      });

      res.status(201).json({ success: true, data: ambulance });
    } catch (error) {
      next(error);
    }
  }

  async updateAmbulance(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const ambulance = await prisma.ambulance.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({ success: true, data: ambulance });
    } catch (error) {
      next(error);
    }
  }

  async updateLocation(req, res, next) {
    try {
      const { id } = req.params;
      const { latitude, longitude, speed = 0.0, emergencyCaseId } = req.body;

      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const spd = parseFloat(speed);

      // Atomic update of current position and recording to history
      const [updatedAmbulance, historyEntry] = await prisma.$transaction([
        prisma.ambulance.update({
          where: { id },
          data: {
            currentLatitude: lat,
            currentLongitude: lng
          }
        }),
        prisma.locationHistory.create({
          data: {
            ambulanceId: id,
            emergencyCaseId: emergencyCaseId || null,
            latitude: lat,
            longitude: lng,
            speed: spd
          }
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          ambulance: updatedAmbulance,
          location: historyEntry
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AmbulanceController();
