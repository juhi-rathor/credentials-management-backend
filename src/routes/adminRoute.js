const express = require("express");

const jwt = require("../middlewares/authMiddleware");
const { sendOtp, verifyOtp, requestEmailChange, verifyEmailChange } = require("../controller/AdminController");
const {
    validateSendOtp,
    validateVerifyOtp,
    validateRequestEmailChange,
    validateVerifyEmailChange
} = require("../validation/Auth.validation");

const {
    validateCreateCredential,
    validateUpdateCredential
} = require("../validation/Credential.validation");

const {
    createCredential,
    getAllCredentials,
    getCredentialById,
    updateCredential,
    deleteCredential
} = require("../controller/CredentialController");

const router = express.Router();

// Auth routes (public)
router.post("/send-otp", validateSendOtp, sendOtp);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);

// Protect all routes below with JWT
router.use(jwt.verifyAdminToken());

// Email Change routes (Private)
router.post("/request-email-change", validateRequestEmailChange, requestEmailChange);
router.post("/verify-email-change", validateVerifyEmailChange, verifyEmailChange);

// Credentials routes (Private)
// CREATE
router.post(
    "/add-credential",
    validateCreateCredential,
    createCredential
);

// GET ALL
router.get(
    "/get-all-credentials",
    getAllCredentials
);

// GET BY ID
router.get(
    "/get-credential-by-id",
    getCredentialById
);

// UPDATE
router.put(
    "/update-credential",
    validateUpdateCredential,
    updateCredential
);

// DELETE
router.delete(
    "/delete-credential",
    deleteCredential
);

module.exports = router;
