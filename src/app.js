const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const globalErrorHandler = require('./middlewares/globalErrorHandler');
const notFoundMiddleware = require('./middlewares/notFoundMiddleware');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(compression());
// Configure Allowed Origins for CORS (Development & Production)
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:3001"
];

if (process.env.FRONTEND_URL) {
  // Strip trailing slash if present to avoid mismatch with browser Origin header
  const cleanedOrigin = process.env.FRONTEND_URL.replace(/\/$/, "");
  allowedOrigins.push(cleanedOrigin);
}

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, or server-to-server requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        console.warn(`⚠️ Blocked by CORS: Origin "${origin}" is not in allowedOrigins:`, allowedOrigins);
        return callback(
          new Error("The CORS policy for this site does not allow access from the specified Origin."),
          false
        );
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
  })
);

app.use(morgan('dev'));

app.use("/api/v1", require("./routes/index"));

app.get('/', (req, res) => {
  res.status(200).json({
    status: "OK",
    success: true,
    message: "Server is running"
  });
});

app.use(notFoundMiddleware);
app.use(globalErrorHandler);

module.exports = app;