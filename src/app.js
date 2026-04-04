
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const recordRoutes = require("./routes/recordRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ─── Security & Parsing ───────────────────────────────────────────────────────

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "10kb" }));        // Prevent large JSON payloads
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded bodies

//Global Rate Limiter
// 100 requests per 15 minutes per IP globally

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many requests from this IP address. Please try again after 15 minutes.",
    },
});

// Stricter limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message:
            "Too many authentication attempts. Please try again after 15 minutes.",
    },
});

app.use(globalLimiter);

//Health Check

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Finance API is running.",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
    });
});

//API Routes

const API_PREFIX = "/api/v1";

app.use(`${API_PREFIX}/auth`, authLimiter, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/records`, recordRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);

// Error Handling

app.use(notFound);       // 404 for unknown routes
app.use(errorHandler);   // Centralized error formatter

module.exports = app;
