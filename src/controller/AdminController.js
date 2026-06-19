const User = require("../models/user.schema");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { successResponse } = require("../response/response");
const jwt = require("../middlewares/authMiddleware");
const sendEmail = require("../utils/email");

/**
 * Helper utility to generate a secure random 6-digit numeric OTP.
 * @returns {string} The generated 6-digit OTP string.
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * @desc    Send OTP to admin email for login verification
 * @route   POST /api/v1/admin/send-otp
 * @access  Public
 */
const sendOtp = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Verify if user account exists with the provided email
    const user = await User.findOne({ email: normalizedEmail }).select("+otp +otpExpiry");

    if (!user) {
        return next(new AppError("No account found with this email", 404));
    }

    // Verify if account is active
    if (!user.isActive) {
        return next(new AppError("Your account has been deactivated. Please contact support.", 403));
    }

    // Generate fresh OTP and set standard 5-minute expiry
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save({ validateBeforeSave: false });

    // Send OTP to email
    try {
        await sendEmail({
            to: user.email,
            subject: "Your Login OTP - Credentials Manager",
            text: `Your OTP for login is: ${otp}. It will expire in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">Login OTP</h2>
                    <p style="color: #555;">Hello <strong>${user.name}</strong>,</p>
                    <p style="color: #555;">Your one-time password for login is:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
                    </div>
                    <p style="color: #888; font-size: 13px;">This OTP will expire in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });
    } catch (err) {
        console.error("Error sending OTP email:", err);
        // Rollback OTP data on the user object if email dispatch fails
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError("Failed to send OTP email. Please try again later.", 500));
    }

    return successResponse(res, 200, true, "OTP sent successfully to your email");
});

/**
 * @desc    Verify OTP and log in admin user
 * @route   POST /api/v1/admin/verify-otp
 * @access  Public
 */
const verifyOtp = catchAsync(async (req, res, next) => {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Fetch user details including hidden sensitive fields required for verification
    const user = await User.findOne({ email: normalizedEmail }).select("+otp +otpExpiry +jwtToken");

    if (!user) {
        return next(new AppError("No account found with this email", 404));
    }

    if (!user.isActive) {
        return next(new AppError("Your account has been deactivated. Please contact support.", 403));
    }

    // Verify OTP generation state exists
    if (!user.otp || !user.otpExpiry) {
        return next(new AppError("No OTP found. Please request a new OTP first.", 400));
    }

    // Check if OTP has expired; clear expired state if so
    if (user.otpExpiry < new Date()) {
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError("OTP has expired. Please request a new one.", 400));
    }

    // Verify OTP matches
    if (user.otp !== otp) {
        return next(new AppError("Invalid OTP. Please try again.", 400));
    }

    // Clear OTP details upon successful verification
    user.otp = undefined;
    user.otpExpiry = undefined;

    // Issue JWT and update user session record to enforce single-session concurrency limits
    const token = jwt.assignJwt(user);
    user.jwtToken = token;

    await user.save({ validateBeforeSave: false });

    return successResponse(res, 200, true, "Login successful", {
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
        },
    });
});

/**
 * @desc    Initiate email change workflow by requesting verification to the new email
 * @route   POST /api/v1/admin/request-email-change
 * @access  Private (Admin only)
 */
const requestEmailChange = catchAsync(async (req, res, next) => {
    const { newEmail } = req.body;
    const normalizedNewEmail = newEmail.toLowerCase();
    const userId = req.admin._id;

    // Prevent duplicates across accounts
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
        return next(new AppError("Email is already in use", 400));
    }

    const user = await User.findById(userId);

    // Generate verification code and expiry time (5 minutes)
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.newEmail = normalizedNewEmail;
    await user.save({ validateBeforeSave: false });

    // Send OTP to new address to verify availability and ownership
    try {
        await sendEmail({
            to: user.newEmail,
            subject: "Your Email Change OTP - Credentials Manager",
            text: `Your OTP for changing email is: ${otp}. It will expire in 5 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #333; text-align: center;">Verify New Email</h2>
                    <p style="color: #555;">Hello <strong>${user.name}</strong>,</p>
                    <p style="color: #555;">Your one-time password to verify your new email address is:</p>
                    <div style="background: #f4f4f4; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
                    </div>
                    <p style="color: #888; font-size: 13px;">This OTP will expire in <strong>5 minutes</strong>. Do not share it with anyone.</p>
                </div>
            `,
        });
    } catch (err) {
        // Rollback state changes on failure
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.newEmail = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError("Failed to send OTP to new email. Please try again later.", 500));
    }

    return successResponse(res, 200, true, "OTP sent successfully to your new email");
});

/**
 * @desc    Verify OTP sent to new email address and execute the email update
 * @route   POST /api/v1/admin/verify-email-change
 * @access  Private (Admin only)
 */
const verifyEmailChange = catchAsync(async (req, res, next) => {
    const { newEmail, otp } = req.body;
    const normalizedNewEmail = newEmail.toLowerCase();
    const userId = req.admin._id;

    const user = await User.findById(userId).select("+otp +otpExpiry +newEmail");

    // Ensure email change flow state is fully initialized
    if (!user.otp || !user.otpExpiry || !user.newEmail) {
        return next(new AppError("No email change request found. Please request again.", 400));
    }

    // Ensure verification details match the pending request email
    if (user.newEmail !== normalizedNewEmail) {
        return next(new AppError("New email doesn't match the requested one.", 400));
    }

    // Handle token expiration
    if (user.otpExpiry < new Date()) {
        user.otp = undefined;
        user.otpExpiry = undefined;
        user.newEmail = undefined;
        await user.save({ validateBeforeSave: false });
        return next(new AppError("OTP has expired. Please request a new one.", 400));
    }

    // Validate OTP value match
    if (user.otp !== otp) {
        return next(new AppError("Invalid OTP. Please try again.", 400));
    }

    // Apply new settings and clear transient flow state fields
    user.email = user.newEmail;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.newEmail = undefined;
    await user.save({ validateBeforeSave: false });

    return successResponse(res, 200, true, "Email changed successfully", user);
});

module.exports = {
    sendOtp,
    verifyOtp,
    requestEmailChange,
    verifyEmailChange,
};
