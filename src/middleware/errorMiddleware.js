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

    // ── Prisma-specific error codes ───────────────────────────────────────────
    if (err.code) {
        switch (err.code) {
            // Unique constraint violation (e.g. duplicate email)
            case "P2002": {
                statusCode = 409;
                const field = err.meta?.target?.join(", ") || "field";
                err.message = `A record with this ${field} already exists.`;
                break;
            }
            // Record not found
            case "P2025":
                statusCode = 404;
                err.message = err.meta?.cause || "The requested resource was not found.";
                break;
            // Foreign key constraint failed
            case "P2003":
                statusCode = 400;
                err.message = "Referenced resource does not exist.";
                break;
            // Value out of range for type
            case "P2006":
                statusCode = 400;
                err.message = "Provided value is invalid for the field type.";
                break;
            default:
                break;
        }
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
