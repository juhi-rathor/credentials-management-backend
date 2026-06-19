//success response structure
const successResponse = (res, status = 200, success = true, message, data) => {
    return res.status(status).json({
        status: status,
        success,
        message,
        data,
    });
};

module.exports = { successResponse };