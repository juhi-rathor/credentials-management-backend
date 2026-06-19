const nodemailer = require("nodemailer");
const ENV_CONFIG = require("../config/envConfig");

/**
 * Sends an email using SMTP transporter configurations retrieved from central configuration settings.
 * Skips sending and logs a warning message if SMTP auth configurations are missing.
 * 
 * @param {Object} options - Email configurations object.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Subject line of the email.
 * @param {string} options.text - Raw text representation of the email body.
 * @param {string} [options.html] - Optional HTML representation of the email body.
 * @returns {Promise<void>} Resolves when the email has been sent successfully.
 */
const sendEmail = async (options) => {
    // Gracefully handle missing credentials by outputting warning and continuing operation
    if (!ENV_CONFIG.EMAIL_USER || !ENV_CONFIG.EMAIL_PASS) {
        console.warn("⚠️ Email service not configured. Skipping email sending.");
        return;
    }

    // 1) Configure the SMTP transporter client
    const transporter = nodemailer.createTransport({
        host: ENV_CONFIG.EMAIL_HOST,
        port: Number(ENV_CONFIG.EMAIL_PORT),
        secure: Number(ENV_CONFIG.EMAIL_PORT) === 465, // false for 587, true for 465
        auth: {
            user: ENV_CONFIG.EMAIL_USER,
            pass: ENV_CONFIG.EMAIL_PASS
        }
    });

    // 2) Construct the mail options payload
    const mailOptions = {
        from: `credentials-management <${ENV_CONFIG.EMAIL_FROM}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
    };

    // 3) Execute the transmission call
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
