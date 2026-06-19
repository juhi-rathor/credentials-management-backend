const Joi = require("joi");
const AppError = require("../utils/AppError");
const validate = require("./index.validation");
const sendOtpSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please provide a valid email address",
            "any.required": "Email is required"
        })
});
const verifyOtpSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            "string.empty": "Email is required",
            "string.email": "Please provide a valid email address",
            "any.required": "Email is required"
        }),

    otp: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            "string.empty": "OTP is required",
            "any.required": "OTP is required",
            "string.pattern.base": "OTP must be a 6-digit number"
        })
});
const requestEmailChangeSchema = Joi.object({
    newEmail: Joi.string()
        .email()
        .required()
        .messages({
            "string.empty": "New email is required",
            "string.email": "Please provide a valid new email address",
            "any.required": "New email is required"
        })
});

const verifyEmailChangeSchema = Joi.object({
    newEmail: Joi.string()
        .email()
        .required()
        .messages({
            "string.empty": "New email is required",
            "string.email": "Please provide a valid new email address",
            "any.required": "New email is required"
        }),
    otp: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            "string.empty": "OTP is required",
            "any.required": "OTP is required",
            "string.pattern.base": "OTP must be a 6-digit number"
        })
});

module.exports = {
    validateSendOtp: validate(sendOtpSchema),
    validateVerifyOtp: validate(verifyOtpSchema),
    validateRequestEmailChange: validate(requestEmailChangeSchema),
    validateVerifyEmailChange: validate(verifyEmailChangeSchema)
};