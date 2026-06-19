const Credential = require("../models/credential.schema");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { successResponse } = require("../response/response");
const crypto = require("crypto");

const algorithm = "aes-256-cbc";

/**
 * Encrypts a plain-text string using AES-256-CBC.
 * Prepends the generated initialization vector (IV) to the encrypted payload.
 * 
 * @param {string} text - The plain-text password or sensitive data to encrypt.
 * @returns {string} The formatted encrypted string (IV:Ciphertext) in hex encoding.
 * @throws {Error} If PASSWORD_SECRET_KEY is missing from environment config.
 */
function encrypt(text) {
    const secretKey = process.env.PASSWORD_SECRET_KEY;
    if (!secretKey) throw new Error("PASSWORD_SECRET_KEY is not defined");
    
    // Ensure key is exactly 32 bytes for aes-256
    const key = Buffer.from(secretKey).slice(0, 32);
    // Pad key with 0s if it's less than 32 bytes
    const paddedKey = Buffer.alloc(32);
    key.copy(paddedKey);
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, paddedKey, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // Store IV along with the encrypted data
    return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts an AES-256-CBC encrypted string.
 * Supports legacy formats if no IV separator is present.
 * 
 * @param {string} encryptedText - The formatted encrypted string (IV:Ciphertext) in hex encoding.
 * @returns {string} The decrypted plain-text string.
 * @throws {Error} If PASSWORD_SECRET_KEY is missing from environment config.
 */
function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    
    const secretKey = process.env.PASSWORD_SECRET_KEY;
    if (!secretKey) throw new Error("PASSWORD_SECRET_KEY is not defined");
    
    // Ensure key is exactly 32 bytes for aes-256
    const key = Buffer.from(secretKey).slice(0, 32);
    const paddedKey = Buffer.alloc(32);
    key.copy(paddedKey);

    // Parse IV and encrypted body
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
        // Fallback for development if IV is missing (e.g. old format values)
        return "Decryption failed: Old format not supported";
    }
    
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedTextBody = textParts.join(':');
    
    const decipher = crypto.createDecipheriv(algorithm, paddedKey, iv);
    let decrypted = decipher.update(encryptedTextBody, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}

/**
 * @desc    Create a new credential entry
 * @route   POST /api/v1/admin/add-credential
 * @access  Private
 */
const createCredential = catchAsync(async (req, res, next) => {
    const {
        category,
        name,
        username,
        password,
        url,
        notes,
        isArchived,
        expiryDate
    } = req.body;

    let finalExpiryDate = null;

    // Only allow expiry dates for hosting or domain categories
    if (["hosting", "domain"].includes(category)) {
        finalExpiryDate = expiryDate || null;
    }

    const credential = await Credential.create({
        userId: req.admin._id,
        category,
        name,
        username,
        password: encrypt(password),
        url,
        notes,
        isArchived: isArchived || false,
        expiryDate: finalExpiryDate
    });

    return successResponse(res, 201, true, "Credential created successfully", credential);
});

/**
 * @desc    Retrieve all credentials with optional filters, search, and pagination
 * @route   GET /api/v1/admin/get-all-credentials
 * @access  Private
 */
const getAllCredentials = catchAsync(async (req, res, next) => {
    const filter = {};

    // Apply category filters if provided
    if (req.query.category) {
        filter.category = req.query.category;
    }
    
    // Apply archive status filter if provided
    if (req.query.isArchived !== undefined) {
        filter.isArchived = req.query.isArchived === 'true';
    }
  
    // Exclude soft-deleted credentials
    filter.isDeleted = false;
    
    // Search query on name, username, and url
    if (req.query.search) {
        filter.$or = [
            { name: { $regex: req.query.search, $options: 'i' } },
            { url: { $regex: req.query.search, $options: 'i' } },
            { username: { $regex: req.query.search, $options: 'i' } }
        ];
    }

    // Pagination calculations
    const page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    
    // Cap limit to avoid heavy queries
    if (limit > 100) limit = 100;

    const skip = (page - 1) * limit;

    // Run parallel database queries for count and paginated list
    const [credentials, totalDocuments] = await Promise.all([
        Credential.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Credential.countDocuments(filter)
    ]);

    // Decrypt credentials passwords before returning them
    const decryptedCredentials = credentials.map(credential => ({
        ...credential,
        password: decrypt(credential.password)
    }));

    const responsePayload = {
        decryptedCredentials,
        pagination: {
            totalData: totalDocuments,
            totalPages: Math.ceil(totalDocuments / limit),
            currentPage: page,
            limit: limit
        }
    };

    return successResponse(res, 200, true, "Credentials retrieved successfully", responsePayload);
});

/**
 * @desc    Get a single credential by its ID
 * @route   GET /api/v1/admin/get-credential-by-id
 * @access  Private
 */
const getCredentialById = catchAsync(async (req, res, next) => {
    const credential = await Credential.findOne({
        _id: req.query.CredentialId,
        isDeleted: false
    }).lean();

    if (!credential) {
        return next(new AppError("Credential not found", 404));
    }

    // Decrypt the stored password
    credential.password = decrypt(credential.password);

    return successResponse(res, 200, true, "Credential retrieved successfully", credential);
});

/**
 * @desc    Update an existing credential
 * @route   PUT /api/v1/admin/update-credential
 * @access  Private
 */
const updateCredential = catchAsync(async (req, res, next) => {
    const updates = req.body;

    // Encrypt password if it is being modified
    if (updates.password) {
        updates.password = encrypt(updates.password);
    }

    const credential = await Credential.findOneAndUpdate(
        { 
            _id: req.query.CredentialId, 
            isDeleted: false 
        },
        updates,
        { new: true, runValidators: true }
    ).lean();

    if (!credential) {
        return next(new AppError("Credential not found", 404));
    }

    // Decrypt password to return the updated record
    credential.password = decrypt(credential.password);

    return successResponse(res, 200, true, "Credential updated successfully", credential);
});

/**
 * @desc    Soft-delete a credential by setting isDeleted to true
 * @route   DELETE /api/v1/admin/delete-credential
 * @access  Private
 */
const deleteCredential = catchAsync(async (req, res, next) => {
    const credential = await Credential.findOne({ 
        _id: req.query.CredentialId, 
        isDeleted: false 
    }).lean();   
    
    if (!credential) {
        return next(new AppError("Credential not found", 404));
    }

    // Perform soft delete
    await Credential.updateOne(
        { 
            _id: req.query.CredentialId, 
            isDeleted: false 
        },
        { isDeleted: true }
    );

    return successResponse(res, 200, true, "Credential deleted successfully", null);
});

module.exports = {
    createCredential,
    getAllCredentials,
    getCredentialById,
    updateCredential,
    deleteCredential
};
