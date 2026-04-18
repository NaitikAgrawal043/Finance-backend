
require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = parseInt(process.env.PORT, 10) || 5000;

const start = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`Finance API running on http://localhost:${PORT}`);
            console.log(`Environment : ${process.env.NODE_ENV || "development"}`);
            console.log(`Started at   : ${new Date().toISOString()}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            console.log(`\n  ${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                const mongoose = require("mongoose");
                if (mongoose.connection.readyState === 1) {
                    await mongoose.connection.close();
                }
                console.log("Database disconnected. Process terminated.");
                process.exit(0);
            });

            // Force exit if graceful shutdown takes too long
            setTimeout(() => {
                console.error("Forcing shutdown after timeout.");
                process.exit(1);
            }, 10_000);
        };

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Unhandled rejection / exception safety nets
        process.on("unhandledRejection", (reason, promise) => {
            console.error("Unhandled Rejection at:", promise, "reason:", reason);
        });

        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            process.exit(1);
        });
    } catch (error) {
        console.error("Failed to start server:", error.message);
        const mongoose = require("mongoose");
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

start();
