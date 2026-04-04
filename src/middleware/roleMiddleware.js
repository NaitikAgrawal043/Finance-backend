/**
 * roleMiddleware.js
 * Factory middleware for role-based access control (RBAC).
 */

/**
 * authorizeRoles
 *
 * Returns a middleware function that allows access only to users
 * whose role is in the provided list.
 *
 * Usage:
 *   router.post("/records", authenticateUser, authorizeRoles("admin"), ...)
 *   router.get("/records", authenticateUser, authorizeRoles("admin", "analyst"), ...)
 *
 * @param  {...string} allowedRoles - Roles that are permitted
 * @returns {Function} Express middleware
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // authenticateUser must have run first and populated req.user
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required before authorization.",
            });
        }

        const { role } = req.user;

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This action requires one of the following roles: [${allowedRoles.join(
                    ", "
                )}]. Your current role is '${role}'.`,
            });
        }

        next();
    };
};

module.exports = { authorizeRoles };
