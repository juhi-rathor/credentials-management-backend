const mongoose = require("mongoose");
const ENV_CONFIG = require("./envConfig");
const dns = require("dns");

// Set DNS servers globally for this process to avoid local ISP DNS querySrv ECONNREFUSED failures
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (error) {
    console.warn("⚠️ Failed to set custom DNS servers, using system default:", error.message);
}

mongoose.set("strictQuery", true);

const connectDB = async () => {
    const MONGO_URI = ENV_CONFIG.MONGO_URI;

    if (!MONGO_URI) {
        console.error("❌ MONGO_URI not defined");
        process.exit(1);
    }

    try {
        await mongoose.connect(MONGO_URI, {
            autoIndex: true,         // Changed to true to enable uniqueness constraints
            maxPoolSize: 20,         // handle concurrent ops
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log("✅ MongoDB connected");
    } catch (error) {
        console.error("❌ MongoDB connection failed:", error.message);
        process.exit(1); // fail fast
    }
};

// Graceful shutdown
const disconnectDB = async () => {
    try {
        await mongoose.connection.close();
        console.log("🛑 MongoDB disconnected");
    } catch (err) {
        console.error("Error disconnecting MongoDB", err);
    }
};

module.exports = {
    connectDB,
    disconnectDB
};
