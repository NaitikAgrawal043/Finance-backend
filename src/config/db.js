const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.DATABASE_URL;
        if (!uri) {
            throw new Error("MONGO_URI is not defined in environment variables.");
        }
        await mongoose.connect(uri);
        console.log("Database connected successfully.");
    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
