/**
 * authMiddleware.js
 * Verifies JWT tokens and ensures users are active before granting access.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware: Authenticate User
 *
 * Expects an Authorization header with value: "Bearer <token>"
 * On success, attaches `req.user` (the full DB user row, minus password).
 * Blocks inactive users with 403.
 */
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // ── 1. Header presence check ──────────────────────────────────────────
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message:
                    "Access denied. No token provided. Use 'Authorization: Bearer <token>'.",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({
                success: false,
                message: "Access denied. Token is malformed.",
            });
        }

        // ── 2. Verify token ───────────────────────────────────────────────────
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Session expired. Please log in again.",
                });
            }
            if (err.name === "JsonWebTokenError") {
                return res.status(401).json({
                    success: false,
                    message: "Invalid token. Authentication failed.",
                });
            }
            // NotBeforeError or other
            return res.status(401).json({
                success: false,
                message: "Token validation failed.",
            });
        }

        // ── 3. Fetch user from DB (ensure user still exists) ─────────────────
        const user = await User.findById(decoded.id).select(
            "name email role status createdAt"
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User associated with this token no longer exists.",
            });
        }

        // ── 4. Block inactive users ───────────────────────────────────────────
        if (user.status === "inactive") {
            return res.status(403).json({
                success: false,
                message:
                    "Your account has been deactivated. Please contact an administrator.",
            });
        }

        // ── 5. Attach to request ──────────────────────────────────────────────
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = { authenticateUser };
