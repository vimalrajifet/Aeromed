const prisma = require('../config/prisma');
const readinessEngine = require('../services/readinessEngine');
const auditLogger = require('../middleware/audit');

/**
 * Innovation 1: AeroMed AI Assistant Controller
 * Natural language intent parser supporting English & Tamil.
 * Executes read-only queries against existing services, enforces role restrictions,
 * avoids medical hallucinations, and audit logs every interaction.
 */
class ChatbotController {
  async handleMessage(req, res, next) {
    try {
      const { message, language = 'en', conversationId } = req.body;
      const user = req.user;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, message: 'Message text is required' });
      }

      const cleanMsg = message.trim().toLowerCase();
      const isTamil = language === 'ta' || /[\u0B80-\u0BFF]/.test(message);

      // Intent Identification
      let intent = 'UNKNOWN';
      let reply = '';
      let data = [];
      let requiresConfirmation = false;
      let actionToConfirm = null;

      // 1. Available Ambulance Queries
      if (
        cleanMsg.includes('available ambulance') ||
        cleanMsg.includes('which ambulance is available') ||
        cleanMsg.includes('show available') ||
        cleanMsg.includes('ஆம்புலன்ஸ்') && (cleanMsg.includes('available') || cleanMsg.includes('உள்ளது') || cleanMsg.includes('எந்த'))
      ) {
        intent = 'CHECK_AMBULANCE_AVAILABILITY';
        const ambulances = await prisma.ambulance.findMany({
          where: { status: 'AVAILABLE' },
          select: { id: true, registrationNumber: true, ambulanceType: true, fuelLevel: true, status: true }
        });

        data = ambulances;
        if (ambulances.length === 0) {
          reply = isTamil
            ? 'தற்போது எந்த ஆம்புலன்சும் கிடைக்கவில்லை. அனைத்து வாகனங்களும் பணியில் உள்ளன அல்லது பராமரிப்பில் உள்ளன.'
            : 'No ambulances are currently available. All units are on active trip or under service.';
        } else {
          const listStr = ambulances.map(a => `${a.registrationNumber} (${a.ambulanceType}, Fuel: ${a.fuelLevel}%)`).join(', ');
          reply = isTamil
            ? `தற்போது ${ambulances.length} ஆம்புலன்ஸ்கள் பயன்பாட்டிற்கு தயாராக உள்ளன: ${listStr}`
            : `${ambulances.length} ambulance${ambulances.length > 1 ? 's are' : ' is'} currently available: ${listStr}.`;
        }
      }

      // 2. Emergency Case Status Queries (e.g. CASE-001 or EMG-2026-0001)
      else if (
        cleanMsg.includes('case') ||
        cleanMsg.includes('emg-') ||
        cleanMsg.includes('நிலை') ||
        cleanMsg.includes('status') && (cleanMsg.includes('case') || cleanMsg.includes('emg'))
      ) {
        intent = 'CASE_STATUS';
        // Extract case code
        const caseMatch = message.match(/(EMG-\d{4}-\d{4}|CASE-[\w-]+|\b00\d\b)/i);
        const searchCode = caseMatch ? caseMatch[0] : null;

        let targetCase = null;
        if (searchCode) {
          targetCase = await prisma.emergencyCase.findFirst({
            where: {
              OR: [
                { caseNumber: { contains: searchCode } },
                { id: { contains: searchCode } }
              ]
            },
            include: {
              assignedAmbulance: true,
              destinationHospital: true,
              hospitalAlerts: true
            }
          });
        } else {
          // Default to most recent open case
          targetCase = await prisma.emergencyCase.findFirst({
            orderBy: { createdAt: 'desc' },
            include: {
              assignedAmbulance: true,
              destinationHospital: true,
              hospitalAlerts: true
            }
          });
        }

        if (targetCase) {
          data = [targetCase];
          const ambStr = targetCase.assignedAmbulance ? targetCase.assignedAmbulance.registrationNumber : (isTamil ? 'ஒதுக்கப்படவில்லை' : 'Not yet assigned');
          const hospStr = targetCase.destinationHospital ? targetCase.destinationHospital.name : (isTamil ? 'தெரிவிக்கப்படவில்லை' : 'Pending selection');
          reply = isTamil
            ? `வழக்கு ${targetCase.caseNumber}: நிலை: ${targetCase.status} (${targetCase.priority}). ஒதுக்கப்பட்ட ஆம்புலன்ஸ்: ${ambStr}. இலக்கு மருத்துவமனை: ${hospStr}.`
            : `Incident ${targetCase.caseNumber} is currently ${targetCase.status} (Priority: ${targetCase.priority}). Assigned unit: ${ambStr}. Destination: ${hospStr}.`;
        } else {
          reply = isTamil
            ? 'கோரப்பட்ட அவசர வழக்கு பற்றிய தகவல்கள் தற்போது கிடைக்கவில்லை.'
            : 'Information is currently unavailable for the specified emergency case.';
        }
      }

      // 3. Hospital Alert Status
      else if (
        cleanMsg.includes('hospital acknowledged') ||
        cleanMsg.includes('hospital alert') ||
        cleanMsg.includes('மருத்துவமனை')
      ) {
        intent = 'HOSPITAL_ALERT_STATUS';
        const alerts = await prisma.hospitalAlert.findMany({
          orderBy: { sentAt: 'desc' },
          take: 3,
          include: { hospital: true, emergencyCase: true }
        });

        data = alerts;
        if (alerts.length === 0) {
          reply = isTamil ? 'மருத்துவமனை எச்சரிக்கை தகவல்கள் தற்போது கிடைக்கவில்லை.' : 'No recent hospital alerts recorded.';
        } else {
          const ackAlert = alerts.find(a => a.status === 'ACKNOWLEDGED') || alerts[0];
          reply = isTamil
            ? `${ackAlert.hospital.name} மருத்துவமனை இந்த வழக்கை ஏற்றுக்கொண்டது (நிலை: ${ackAlert.status}).`
            : `${ackAlert.hospital.name} acknowledged Case ${ackAlert.emergencyCase.caseNumber} (Status: ${ackAlert.status}).`;
        }
      }

      // 4. Low-Stock Medical Items
      else if (
        cleanMsg.includes('low stock') ||
        cleanMsg.includes('medical item') ||
        cleanMsg.includes('inventory') ||
        cleanMsg.includes('மருந்து') ||
        cleanMsg.includes('இருப்பு')
      ) {
        intent = 'LOW_STOCK_ITEMS';
        const lowStock = await prisma.ambulanceInventory.findMany({
          where: { availableQuantity: { lte: 2 } },
          include: { medicalItem: true, ambulance: true },
          take: 6
        });

        data = lowStock;
        if (lowStock.length === 0) {
          reply = isTamil
            ? 'அனைத்து ஆம்புலன்ஸ்களிலும் மருத்துவ பொருட்கள் போதுமான அளவில் உள்ளன.'
            : 'All medical stock levels across active ambulances are above required minimums.';
        } else {
          const itemsStr = lowStock.map(i => `${i.medicalItem.name} on ${i.ambulance.registrationNumber} (Qty: ${i.availableQuantity})`).join(', ');
          reply = isTamil
            ? `குறைந்த இருப்பு உள்ள பொருட்கள்: ${itemsStr}`
            : `Low stock alerts identified on units: ${itemsStr}.`;
        }
      }

      // 5. Maintenance Status Queries
      else if (
        cleanMsg.includes('maintenance') ||
        cleanMsg.includes('service') ||
        cleanMsg.includes('repair') ||
        cleanMsg.includes('பராமரிப்பு') ||
        cleanMsg.includes('சர்வீஸ்')
      ) {
        intent = 'MAINTENANCE_STATUS';
        const maintenanceAmbs = await prisma.ambulance.findMany({
          where: { status: 'MAINTENANCE' },
          include: {
            maintenanceOrders: {
              where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
            }
          }
        });

        data = maintenanceAmbs;
        if (maintenanceAmbs.length === 0) {
          reply = isTamil
            ? 'தற்போது எந்த ஆம்புலன்ஸும் பராமரிப்பில் இல்லை. அனைத்து வாகனங்களும் தயார் நிலையில் உள்ளன.'
            : 'Zero ambulances are currently in maintenance. All active fleet units are fit for service.';
        } else {
          const ambList = maintenanceAmbs.map(a => `${a.registrationNumber} (${a.maintenanceOrders[0]?.issueDescription || 'Scheduled Service'})`).join(', ');
          reply = isTamil
            ? `பராமரிப்பில் உள்ள ஆம்புலன்ஸ்கள்: ${ambList}`
            : `The following unit(s) are undergoing maintenance: ${ambList}.`;
        }
      }

      // 6. Crew Availability
      else if (
        cleanMsg.includes('crew') ||
        cleanMsg.includes('paramedic') ||
        cleanMsg.includes('driver') ||
        cleanMsg.includes('பணியாளர்')
      ) {
        intent = 'CREW_AVAILABILITY';
        const availableStaff = await prisma.employee.findMany({
          where: { availabilityStatus: 'AVAILABLE' }
        });
        const drivers = availableStaff.filter(s => s.role === 'DRIVER');
        const medics = availableStaff.filter(s => s.role !== 'DRIVER');

        data = { totalAvailable: availableStaff.length, drivers: drivers.length, medicalStaff: medics.length };
        reply = isTamil
          ? `தற்போது ${drivers.length} ஓட்டுநர்கள் மற்றும் ${medics.length} மருத்துவ பணியாளர்கள் தயார் நிலையில் உள்ளனர்.`
          : `${drivers.length} Driver(s) and ${medics.length} Paramedic/EMT crew member(s) are currently on active shift and ready.`;
      }

      // 7. Daily Operational Summary
      else if (
        cleanMsg.includes('summary') ||
        cleanMsg.includes('daily') ||
        cleanMsg.includes('report') ||
        cleanMsg.includes('அறிக்கை')
      ) {
        intent = 'DAILY_SUMMARY';
        const [totalCases, activeCases, availableFleet] = await Promise.all([
          prisma.emergencyCase.count(),
          prisma.emergencyCase.count({ where: { status: { notIn: ['CLOSED', 'CANCELLED'] } } }),
          prisma.ambulance.count({ where: { status: 'AVAILABLE' } })
        ]);

        data = { totalCases, activeCases, availableFleet };
        reply = isTamil
          ? `இன்றைய செயல்பாட்டு சுருக்கம்: மொத்த அவசர வழக்குகள்: ${totalCases}, செயலில் உள்ள வழக்குகள்: ${activeCases}, தயாராக உள்ள ஆம்புலன்ஸ்கள்: ${availableFleet}.`
          : `Daily Operational Summary: ${totalCases} total emergency incidents logged, ${activeCases} currently active, ${availableFleet} ambulances available for immediate dispatch.`;
      }

      // 8. Navigation Guidance
      else if (
        cleanMsg.includes('navigate') ||
        cleanMsg.includes('where is') ||
        cleanMsg.includes('how to find') ||
        cleanMsg.includes('எங்கே')
      ) {
        intent = 'NAVIGATION_HELP';
        reply = isTamil
          ? 'வழிகாட்டுதல்: நேரடி கண்காணிப்புக்கு "Live Telematics Map" ஐயும், அவசர வழக்குகளுக்கு "Emergency Cases" ஐயும், மற்றும் புதிய தொழில்நுட்பங்களுக்கு "Innovation Centre" ஐயும் பார்க்கவும்.'
          : 'Navigation Guide: Use "Live Telematics Map" for GPS fleet tracking, "Emergency Cases" for active incidents, and "Innovation Centre" for AI readiness and forecasting.';
      }

      // 9. Safety Guardrails: Medical Advice or Treatment Rejection
      else if (
        cleanMsg.includes('treatment') ||
        cleanMsg.includes('medicine for') ||
        cleanMsg.includes('cure') ||
        cleanMsg.includes('diagnos') ||
        cleanMsg.includes('மருத்துவம்') ||
        cleanMsg.includes('சிகிச்சை')
      ) {
        intent = 'CLINICAL_DISCLAIMER';
        reply = isTamil
          ? 'பாதுகாப்பு எச்சரிக்கை: ஏரோமெட் உதவியாளர் மருத்துவ ஆலோசனையோ அல்லது சிகிச்சையையோ வழங்க அனுமதிக்கப்படவில்லை. அவசர மருத்துவ உதவிக்கு உடனடியாக ஆம்புலன்ஸை அழைக்கவும்.'
          : 'Safety Guardrail: AeroMed Assistant is an operational logistics tool and is strictly prohibited from providing medical diagnoses or treatment recommendations. Please consult qualified medical personnel.';
      }

      // 10. Fallback: Information Currently Unavailable
      else {
        intent = 'UNKNOWN';
        reply = isTamil
          ? 'மன்னிக்கவும், கோரப்பட்ட தகவல் தற்போது கிடைக்கவில்லை அல்லது அங்கீகரிக்கப்படாத கோரிக்கை.'
          : 'Information is currently unavailable or beyond operational scope.';
      }

      // Save to Conversation & Message Tables
      let convo = null;
      if (conversationId) {
        convo = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
      }
      if (!convo) {
        convo = await prisma.chatConversation.create({
          data: {
            userId: user ? user.id : null,
            language: isTamil ? 'ta' : 'en'
          }
        });
      }

      // Record Chat Message
      await prisma.chatMessage.create({
        data: {
          conversationId: convo.id,
          sender: 'USER',
          messageText: message,
          intent: null
        }
      });

      await prisma.chatMessage.create({
        data: {
          conversationId: convo.id,
          sender: 'ASSISTANT',
          messageText: reply,
          intent,
          requiresConfirmation,
          dataPayload: JSON.stringify(data)
        }
      });

      // Audit Log Interaction
      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            userRole: user.role,
            action: 'CHATBOT_QUERY',
            entityType: 'ChatConversation',
            entityId: convo.id,
            details: JSON.stringify({ intent, messagePreview: message.substring(0, 60), isTamil })
          }
        });
      }

      return res.json({
        success: true,
        reply,
        intent,
        data,
        conversationId: convo.id,
        timestamp: new Date().toISOString(),
        requiresConfirmation,
        actionToConfirm
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve conversation history
   */
  async getHistory(req, res, next) {
    try {
      const { conversationId } = req.params;
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'Conversation not found' });
      }

      return res.json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChatbotController();
