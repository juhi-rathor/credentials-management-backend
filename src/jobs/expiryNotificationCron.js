const Credential = require('../models/credential.schema');
const User = require('../models/user.schema');
const sendEmail = require('../utils/email');
const ENV_CONFIG = require('../config/envConfig');
const cron = require('node-cron');
const {
  buildExpiryReminderHtml,
  getDaysLeft,
} = require('../templates/expiryReminderTemplate');

const DAILY_CRON_EXPRESSION = '0 0 * * *';
const ALERT_WINDOW_IN_DAYS = 30;

let schedulerRef;

const isReminderPending = (credential) => {
  if (!credential.expiryDate) return false;
  if (!credential.lastExpiryReminderSentFor) return true;

  return (
    new Date(credential.expiryDate).getTime() !==
    new Date(credential.lastExpiryReminderSentFor).getTime()
  );
};

const sendExpiryReminder = async () => {
  const now = new Date();
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + ALERT_WINDOW_IN_DAYS);

  const expiringCredentials = await Credential.find({
    expiryDate: { $gte: now, $lte: limitDate },
    isDeleted: false,
    isArchived: false,
    category: { $in: ['domain', 'hosting'] },
  })
    .sort({ expiryDate: 1 })
    .lean();

  const pendingReminderCredentials = expiringCredentials.filter(isReminderPending);

  if (!pendingReminderCredentials.length) {
    console.log('ℹ️ No credentials expiring in next 30 days');
    return;
  }

  const adminUser = await User.findOne({ isActive: true })
    .sort({ createdAt: 1 })
    .select('email')
    .lean();

  const adminEmail = adminUser?.email || ENV_CONFIG.email;

  if (!adminEmail) {
    console.warn('⚠️ Admin email not found. Expiry alert email skipped.');
    return;
  }

  const textBody = [
    'Domain and Hosting credentials expiring in next 30 days:',
    ...pendingReminderCredentials.map(
      (item) =>
        `${item.category} | ${item.name} | ${new Date(item.expiryDate).toDateString()} | ${getDaysLeft(item.expiryDate)} day(s) left`
    ),
  ].join('\n');

  await sendEmail({
    to: adminEmail,
    subject: `Domain/Hosting Expiry Alert: ${pendingReminderCredentials.length} credential(s)`,
    text: textBody,
    html: buildExpiryReminderHtml(pendingReminderCredentials),
  });

  await Credential.bulkWrite(
    pendingReminderCredentials.map((item) => ({
      updateOne: {
        filter: { _id: item._id },
        update: { $set: { lastExpiryReminderSentFor: item.expiryDate } },
      },
    }))
  );

  console.log(
    `✅ Expiry alert sent to admin (${adminEmail}) for ${pendingReminderCredentials.length} credentials`
  );
};

const startExpiryNotificationCron = () => {
  if (schedulerRef) return;

  sendExpiryReminder().catch((error) => {
    console.error('❌ Failed to run expiry reminder job:', error.message);
  });

  schedulerRef = cron.schedule(DAILY_CRON_EXPRESSION, () => {
    sendExpiryReminder().catch((error) => {
      console.error('❌ Failed to run expiry reminder job:', error.message);
    });
  });

  console.log('⏰ Expiry reminder cron started (runs daily at 12:00 AM server time)');
};

const stopExpiryNotificationCron = () => {
  if (!schedulerRef) return;
  schedulerRef.stop();
  schedulerRef = null;
};

module.exports = {
  startExpiryNotificationCron,
  stopExpiryNotificationCron,
};