/**
 * errorMiddleware.js
 * Centralized error handling middleware.
 *
 * All errors thrown or passed via next(err) land here.
 * Returns a consistent JSON response structure.
 */

/**
 * notFound — 404 handler for unregistered routes.
 * Mount BEFORE errorHandler but AFTER all valid routes.
 */
const notFound = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

/**
 * errorHandler — catch-all error middleware.
 * Must be last middleware in the Express chain (4 arguments).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // ── Determine status code ─────────────────────────────────────────────────
    let statusCode = err.statusCode || err.status || 500;

    // ── Mongoose-specific error codes ─────────────────────────────────────────
    if (err.code === 11000) {
        // Unique constraint violation (e.g. duplicate email)
        statusCode = 409;
        const field = err.keyValue ? Object.keys(err.keyValue).join(", ") : "field";
        err.message = `A record with this ${field} already exists.`;
    }

    if (err.name === "CastError") {
        // Invalid ObjectId
        statusCode = 400;
        err.message = "Provided ID format is invalid.";
    }

    // ── JWT errors (shouldn't reach here normally, handled in auth middleware) ──
    if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        err.message = "Invalid token.";
    }
    if (err.name === "TokenExpiredError") {
        statusCode = 401;
        err.message = "Token has expired.";
    }

    // ── Validation errors ─────────────────────────────────────────────────────
    if (err.name === "ValidationError") {
        statusCode = 400;
    }

    // ── SyntaxError from malformed JSON body ──────────────────────────────────
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        statusCode = 400;
        err.message = "Invalid JSON in request body.";
    }

    // ── Log in development ────────────────────────────────────────────────────
    if (process.env.NODE_ENV === "development") {
        console.error(`[ERROR] ${statusCode} — ${err.message}`);
        if (statusCode === 500) console.error(err.stack);
    }

    // ── Response ──────────────────────────────────────────────────────────────
    res.status(statusCode).json({
        success: false,
        message: err.message || "An unexpected internal server error occurred.",
        ...(process.env.NODE_ENV === "development" && statusCode === 500
            ? { stack: err.stack }
            : {}),
    });
};

module.exports = { notFound, errorHandler };
