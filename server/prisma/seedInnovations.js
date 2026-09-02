const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedInnovations() {
  console.log('Seeding AeroMed Innovation Reference Data...');

  // 1. Seed Hospital Capabilities & Availability
  const hospitals = await prisma.hospital.findMany();
  for (const hosp of hospitals) {
    const existingCaps = await prisma.hospitalCapability.count({ where: { hospitalId: hosp.id } });
    if (existingCaps === 0) {
      const depts = hosp.availableDepartments.split(',').map(d => d.trim());
      for (const dept of depts) {
        await prisma.hospitalCapability.create({
          data: {
            hospitalId: hosp.id,
            departmentName: dept,
            hasICU: ['CARDIOLOGY', 'TRAUMA_CARE', 'ICU'].includes(dept),
            hasCathLab: dept === 'CARDIOLOGY',
            hasTraumaWard: ['TRAUMA_CARE', 'SURGERY'].includes(dept),
            totalBeds: 25,
            availableBeds: Math.floor(Math.random() * 8) + 3
          }
        });
      }

      await prisma.hospitalAvailability.create({
        data: {
          hospitalId: hosp.id,
          status: hosp.availabilityStatus || 'ACCEPTING',
          activeEmergencyCount: Math.floor(Math.random() * 4) + 1,
          averageAckSeconds: 95.0 + Math.random() * 50
        }
      });
    }
  }

  // 2. Seed Historical Emergency Demand Forecast (Hourly & Day of week in Chennai)
  const existingForecast = await prisma.demandForecast.count();
  if (existingForecast === 0) {
    const zones = ['T. Nagar', 'Anna Nagar', 'Mylapore', 'Guindy', 'Marina', 'Velachery', 'Tambaram'];
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        for (const zone of zones) {
          // Peak hours: 8-11 AM and 5-9 PM
          const isPeak = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21);
          const baseVolume = isPeak ? 3.8 + Math.random() * 2.2 : 0.8 + Math.random() * 1.4;

          await prisma.demandForecast.create({
            data: {
              targetHour: hour,
              targetDayOfWeek: day,
              geographicZone: zone,
              predictedCallVolume: Number(baseVolume.toFixed(1)),
              modelUsed: 'EXPONENTIAL_SMOOTHING',
              mae: 0.38,
              mse: 0.22
            }
          });
        }
      }
    }
    console.log('✓ Seeded 24x7 Emergency Demand Forecast for 7 Chennai zones.');
  }

  console.log('✓ Innovation reference data seeded successfully.');
}

seedInnovations()
  .catch((e) => {
    console.error('Seed error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
