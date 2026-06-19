const jsonwebtoken = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const adminModal = require("../models/user.schema");
const ENV_CONFIG = require("../config/envConfig");

// Load the JWT signing secret from env config
const SECRET_KEY = process.env.JWT_ACCESS_SECRET || ENV_CONFIG.JWT_SECRET;

/**
 * JWT Authentication Utility Object
 */
const jwt = {
  /**
   * Generates a signed JWT token for the admin user session.
   * @param {Object} admin - The admin user object.
   * @param {string} admin._id - The unique identifier of the admin.
   * @param {string} admin.email - The admin's email.
   * @returns {string} The signed JWT token.
   */
  assignJwt: (admin) => {
    const payload = {
      _id: admin?._id,
      email: admin?.email,
    };
    const options = {
      expiresIn: ENV_CONFIG.JWT_EXPIRES_IN || "7d",
    };
    return jsonwebtoken.sign(payload, SECRET_KEY, options);
  },

  /**
   * Express middleware to verify the incoming admin authorization token.
   * Enforces single-session logins by comparing the token to the database-stored token.
   * @param {Array|null} roles - Optional array of roles for access control (future use).
   * @returns {Function} Express middleware callback.
   */
  verifyAdminToken: (roles = null) => {
    return async (req, res, next) => {
      try {
        let token = req.headers.authorization;

        // Ensure token header is provided
        if (!token) {
          return next(new AppError("Please provide token", 401));
        }

        // Extract token from standard 'Bearer <token>' format
        if (token.startsWith("Bearer ")) {
          token = token.split(" ")[1];
        }

        let decoded;
        try {
          decoded = jsonwebtoken.verify(token, SECRET_KEY);
        } catch (err) {
          // Send user-friendly error message if token has expired
          if (err.name === "TokenExpiredError") {
            return next(
              new AppError("Session timeout: Please login again", 401)
            );
          }
          return next(new AppError("Access Denied: Invalid Token", 401));
        }

        if (!decoded) {
          return next(new AppError("Access Denied: Invalid Token", 401));
        }

        // Fetch admin from database along with stored token to check single-session state
        const admin = await adminModal.findById(decoded._id).select("+jwtToken");
        if (!admin) {
          return next(new AppError("Admin not found", 401));
        }

        // Check if account has been deactivated
        if (!admin.isActive) {
          return next(new AppError("Account deactivated", 403));
        }

        // Single-session validation: verify the incoming token matches the latest token issued
        if (admin.jwtToken !== token) {
          return next(new AppError("Access Denied: Invalid Token", 403));
        }

        // Attach authenticated admin to req object for downstream use
        req.admin = admin;
        next();
      } catch (error) {
        return next(error);
      }
    };
  },
};

module.exports = jwt;
