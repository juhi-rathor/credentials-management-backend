const User = require('../models/user.schema');
const ENV_CONFIG = require('../config/envConfig');

/**
 * Seeds the initial admin user into the database if no users exist.
 * This runs automatically during the server startup process.
 */
const seedAdmin = async () => {
  // Check if any admin user already exists to prevent duplicate seeding
  const existing = await User.findOne();

  if (existing) {
    console.log('✅ Admin already exists');
    return;
  }

  // Create the default superadmin account using central configuration settings
  await User.create({
    name: ENV_CONFIG.name,
    email: ENV_CONFIG.email,
    password: ENV_CONFIG.password,
  });

  console.log('🔥 Admin Created');
};

module.exports = seedAdmin;