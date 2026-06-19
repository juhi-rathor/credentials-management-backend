require('dotenv').config();

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db.config');
const seedAdmin = require('./seed/adminSeed');
const {
  startExpiryNotificationCron,
  stopExpiryNotificationCron,
} = require('./jobs/expiryNotificationCron');

const PORT = process.env.PORT || 4008;

let server;

(async () => {
  try {
    await connectDB();
    await seedAdmin();
    startExpiryNotificationCron();

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  stopExpiryNotificationCron();

  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('✅ Shutdown complete');
      process.exit(0);
    });
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);