const Joi = require("joi");
const validate = require("./index.validation");

const credentialSchemaObj = {
    category: Joi.string()
        .valid('software', 'website', 'domain', 'hosting', 'email')
        .required()
        .messages({
            "any.only": "Category must be one of software, website, domain, hosting, email",
            "string.empty": "Category is required",
            "any.required": "Category is required"
        }),
    name: Joi.string().required().messages({
        "string.empty": "Name is required",
        "any.required": "Name is required"
    }),
    username: Joi.string().allow('', null).optional(),
    password: Joi.string().required().messages({
        "string.empty": "Password is required",
        "any.required": "Password is required"
    }),
    url: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    expiryDate: Joi.date().allow('', null).optional(),
    isArchived: Joi.boolean().optional()
};

const createCredentialSchema = Joi.object(credentialSchemaObj);

const updateCredentialSchema = Joi.object({
    category: Joi.string().valid('software', 'website', 'domain', 'hosting', 'email').optional(),
    name: Joi.string().optional(),
    username: Joi.string().allow('', null).optional(),
    password: Joi.string().optional(),
    url: Joi.string().allow('', null).optional(),
    notes: Joi.string().allow('', null).optional(),
    expiryDate: Joi.date().allow('', null).optional(),
    isArchived: Joi.boolean().optional(),
    isDeleted: Joi.boolean().optional(),
});

module.exports = {
    validateCreateCredential: validate(createCredentialSchema),
    validateUpdateCredential: validate(updateCredentialSchema)
};
