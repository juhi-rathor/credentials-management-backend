const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, required: true, select: false },
    isActive: { type: Boolean, default: true },

    // OTP fields for login
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },

    // Field for email change
    newEmail: { type: String, select: false },

    // Store current JWT for single-session enforcement
    jwtToken: { type: String, select: false },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);