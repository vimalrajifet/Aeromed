const app = require('./app');
const config = require('./config/config');
const prisma = require('./config/prisma');
const gpsSimulator = require('./services/gpsSimulator');

const PORT = config.PORT;

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✅ SQLite Database connected successfully via Prisma');

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 AeroMed Emergency Fleet Management Backend Active`);
      console.log(`📡 Listening on: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);

      // Start 5-second interval GPS telematics simulator
      gpsSimulator.start(5000);
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      gpsSimulator.stop();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server and database disconnected. Goodbye.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
