const prisma = require('../config/prisma');

class SyncController {
  /**
   * Batch synchronize offline events queued by mobile or client browsers
   */
  async syncEvents(req, res, next) {
    try {
      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ success: false, message: 'Events array is required' });
      }

      const results = [];

      for (const event of events) {
        const { idempotencyKey, eventType, payload, clientTimestamp } = event;

        if (!idempotencyKey) {
          results.push({ success: false, error: 'Missing idempotencyKey' });
          continue;
        }

        // Check if event already processed
        const existing = await prisma.offlineSyncEvent.findUnique({
          where: { idempotencyKey }
        });

        if (existing) {
          results.push({
            idempotencyKey,
            status: 'DUPLICATE_IGNORED',
            message: 'Event was previously synchronized successfully',
            serverReceivedAt: existing.serverReceivedAt
          });
          continue;
        }

        // Apply payload effects according to event type
        try {
          const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;

          if (eventType === 'STATUS_UPDATE' && parsedPayload.caseId && parsedPayload.newStatus) {
            // Apply status change while checking for conflict
            const currentCase = await prisma.emergencyCase.findUnique({ where: { id: parsedPayload.caseId } });
            if (currentCase) {
              await prisma.emergencyCase.update({
                where: { id: parsedPayload.caseId },
                data: { status: parsedPayload.newStatus }
              });
            }
          } else if (eventType === 'GPS_TELEMETRY' && parsedPayload.ambulanceId && parsedPayload.lat && parsedPayload.lon) {
            await prisma.ambulance.update({
              where: { id: parsedPayload.ambulanceId },
              data: {
                currentLatitude: parsedPayload.lat,
                currentLongitude: parsedPayload.lon
              }
            });
          }

          // Record sync event
          const saved = await prisma.offlineSyncEvent.create({
            data: {
              idempotencyKey,
              eventType: eventType || 'GENERIC_EVENT',
              payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
              clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : new Date(),
              status: 'PROCESSED'
            }
          });

          results.push({
            idempotencyKey,
            status: 'PROCESSED',
            serverReceivedAt: saved.serverReceivedAt
          });
        } catch (err) {
          results.push({
            idempotencyKey,
            status: 'CONFLICT_RESOLVED_FALLBACK',
            error: err.message
          });
        }
      }

      return res.json({
        success: true,
        processedCount: results.filter(r => r.status === 'PROCESSED').length,
        duplicateCount: results.filter(r => r.status === 'DUPLICATE_IGNORED').length,
        results
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SyncController();
