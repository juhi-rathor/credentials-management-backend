const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['software', 'website', 'domain', 'hosting', 'email'],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    username: String,
    password: { type: String, required: true },
    url: String,
    notes: String,
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
    // Stores the expiry date value for which reminder was last sent.
    lastExpiryReminderSentFor: { type: Date, default: null },
  },
  { timestamps: true }
);

credentialSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Credential', credentialSchema);