const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");

const NODE_ENV = process.env.NODE_ENV || "development";

const envFile =
    NODE_ENV === "production"
        ? ".env.production"
        : ".env.development";

const envPath = path.resolve(__dirname, `../../${envFile}`);
const fallbackEnvPath = path.resolve(__dirname, "../../.env");

if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else if (fs.existsSync(fallbackEnvPath)) {
    dotenv.config({ path: fallbackEnvPath });
} else {
    dotenv.config();
}

const ENV_CONFIG = {
    PORT: process.env.PORT || 3000,
    MONGO_URI: process.env.MONGO_URI,

    // SuperAdmin Data
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,

    // JWT Config
    JWT_SECRET: process.env.JWT_SECRET || "default_secret_key_12345",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

    // Email Config
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    EMAIL_FROM: process.env.EMAIL_FROM || "no-reply@credentials-management.com"
};

module.exports = ENV_CONFIG;
