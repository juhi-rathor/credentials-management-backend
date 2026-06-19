const { successResponse } = require("../response/response");
const AppError = require("../utils/AppError");

/**
 * Transforms Mongoose CastError (e.g. invalid ObjectIds) into a standard AppError.
 */
const handleCastErrorDB = (err) =>
    new AppError(`Invalid ${err.path}: ${err.value}`, 400);

/**
 * Transforms MongoDB duplicate key error (code 11000) into a clean validation AppError.
 */
const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(`Duplicate value for field: ${field}`, 409);
};

/**
 * Compiles individual Mongoose schema validation errors into a single error string.
 */
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new AppError(`Invalid input data. ${errors.join(". ")}`, 400);
};

/**
 * Sends detailed error telemetry in development environment.
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

/**
 * Sends simplified error payloads in production environment.
 * Note: successResponse helper is used with success=false parameter to maintain 
 * unified API response structures.
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted errors (e.g. invalid user input, not found errors)
    if (err.isOperational) {
        successResponse(res, err.statusCode, false, err.message);
    } else {
        // Programming or internal system errors: log details privately, hide internals from clients
        console.error("🔥 SYSTEM ERROR:", err);
        successResponse(res, 500, false, "Something went wrong!");
    }
};

/**
 * Global Express Error Handling Middleware.
 */
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Route specific database error names to their respective formatting helper functions
        if (err.name === "CastError") error = handleCastErrorDB(err);
        if (err.code === 11000) error = handleDuplicateFieldsDB(err);
        if (err.name === "ValidationError")
            error = handleValidationErrorDB(err);

        sendErrorProd(error, res);
    }
};
