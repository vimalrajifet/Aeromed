const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 10 Additional Ambulances (8 BLS + 2 ALS stationed at Hospitals)...');

  // Hospitals in database
  const apollo = await prisma.hospital.findFirst({ where: { name: { contains: 'Apollo' } } }) || { latitude: 13.0604, longitude: 80.2496 };
  const rggg = await prisma.hospital.findFirst({ where: { name: { contains: 'Rajiv Gandhi' } } }) || { latitude: 13.0818, longitude: 80.2773 };
  const miot = await prisma.hospital.findFirst({ where: { name: { contains: 'MIOT' } } }) || { latitude: 13.0232, longitude: 80.1784 };
  const fortis = await prisma.hospital.findFirst({ where: { name: { contains: 'Fortis' } } }) || { latitude: 13.0067, longitude: 80.2575 };

  // Make sure existing ALS ambulances (TN-01-EM-1001 & TN-02-EM-2001) are stationed directly at hospital coordinates
  await prisma.ambulance.updateMany({
    where: { registrationNumber: 'TN-01-EM-1001' },
    data: { currentLatitude: apollo.latitude, currentLongitude: apollo.longitude, ambulanceType: 'ALS' }
  });

  await prisma.ambulance.updateMany({
    where: { registrationNumber: 'TN-02-EM-2001' },
    data: { currentLatitude: rggg.latitude, currentLongitude: rggg.longitude, ambulanceType: 'ALS' }
  });

  const newAmbulances = [
    // 8 BLS Units deployed across Chennai
    {
      id: 'amb-006',
      registrationNumber: 'TN-04-EM-4001',
      ambulanceType: 'BLS',
      currentLatitude: 13.0784,
      currentLongitude: 80.2608, // Egmore
      fuelLevel: 90.0,
      status: 'AVAILABLE',
      odometerReading: 16500.0
    },
    {
      id: 'amb-007',
      registrationNumber: 'TN-04-EM-4002',
      ambulanceType: 'BLS',
      currentLatitude: 13.0333,
      currentLongitude: 80.2667, // Mylapore
      fuelLevel: 82.0,
      status: 'AVAILABLE',
      odometerReading: 19800.0
    },
    {
      id: 'amb-008',
      registrationNumber: 'TN-05-EM-5001',
      ambulanceType: 'BLS',
      currentLatitude: 12.9815,
      currentLongitude: 80.2180, // Velachery
      fuelLevel: 88.0,
      status: 'AVAILABLE',
      odometerReading: 24300.0
    },
    {
      id: 'amb-009',
      registrationNumber: 'TN-05-EM-5002',
      ambulanceType: 'BLS',
      currentLatitude: 12.9249,
      currentLongitude: 80.1000, // Tambaram
      fuelLevel: 75.0,
      status: 'AVAILABLE',
      odometerReading: 35600.0
    },
    {
      id: 'amb-010',
      registrationNumber: 'TN-06-EM-6001',
      ambulanceType: 'BLS',
      currentLatitude: 13.0382,
      currentLongitude: 80.1565, // Porur
      fuelLevel: 95.0,
      status: 'AVAILABLE',
      odometerReading: 12100.0
    },
    {
      id: 'amb-011',
      registrationNumber: 'TN-06-EM-6002',
      ambulanceType: 'BLS',
      currentLatitude: 13.0500,
      currentLongitude: 80.2121, // Vadapalani
      fuelLevel: 80.0,
      status: 'AVAILABLE',
      odometerReading: 28900.0
    },
    {
      id: 'amb-012',
      registrationNumber: 'TN-07-EM-7001',
      ambulanceType: 'BLS',
      currentLatitude: 13.0012,
      currentLongitude: 80.2565, // Adyar
      fuelLevel: 86.0,
      status: 'AVAILABLE',
      odometerReading: 21400.0
    },
    {
      id: 'amb-013',
      registrationNumber: 'TN-07-EM-7002',
      ambulanceType: 'BLS',
      currentLatitude: 13.0536,
      currentLongitude: 80.2642, // Royapettah
      fuelLevel: 91.0,
      status: 'AVAILABLE',
      odometerReading: 15700.0
    },

    // 2 ALS Units Stationed Always at Hospital Base
    {
      id: 'amb-014',
      registrationNumber: 'TN-08-EM-8001',
      ambulanceType: 'ALS',
      currentLatitude: miot.latitude,
      currentLongitude: miot.longitude, // Stationed at MIOT Hospital
      fuelLevel: 98.0,
      status: 'AVAILABLE',
      odometerReading: 8900.0
    },
    {
      id: 'amb-015',
      registrationNumber: 'TN-08-EM-8002',
      ambulanceType: 'ALS',
      currentLatitude: fortis.latitude,
      currentLongitude: fortis.longitude, // Stationed at Fortis Hospital
      fuelLevel: 96.0,
      status: 'AVAILABLE',
      odometerReading: 9400.0
    }
  ];

  const medicalItems = await prisma.medicalItem.findMany();

  for (const ambData of newAmbulances) {
    const existing = await prisma.ambulance.findUnique({
      where: { registrationNumber: ambData.registrationNumber }
    });

    let ambId = ambData.id;
    if (!existing) {
      const created = await prisma.ambulance.create({
        data: ambData
      });
      ambId = created.id;
      console.log(`✓ Created ${ambData.registrationNumber} (${ambData.ambulanceType})`);
    } else {
      ambId = existing.id;
      await prisma.ambulance.update({
        where: { id: existing.id },
        data: {
          currentLatitude: ambData.currentLatitude,
          currentLongitude: ambData.currentLongitude,
          ambulanceType: ambData.ambulanceType,
          fuelLevel: ambData.fuelLevel
        }
      });
      console.log(`✓ Updated ${ambData.registrationNumber}`);
    }

    // Populate essential inventory for this ambulance
    for (const item of medicalItems) {
      const existingInv = await prisma.ambulanceInventory.findUnique({
        where: { ambulanceId_medicalItemId: { ambulanceId: ambId, medicalItemId: item.id } }
      });
      if (!existingInv) {
        await prisma.ambulanceInventory.create({
          data: {
            ambulanceId: ambId,
            medicalItemId: item.id,
            availableQuantity: ambData.ambulanceType === 'ALS' ? 6 : 4,
            expiryDate: new Date('2027-06-30')
          }
        });
      }
    }
  }

  const totalCount = await prisma.ambulance.count();
  console.log(`Total Fleet Size: ${totalCount} Ambulances.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
