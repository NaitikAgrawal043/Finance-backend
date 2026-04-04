const prisma = require("../config/db");
const { validateStatus } = require("../utils/validators");

// ─── Fields to return
const USER_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    status: true,
    createdAt: true,
};

// ─── Get All Users 

/**
 * Returns all users with optional role/status filtering.
 * @param {{ role?, status?, page?, limit? }} filters
 */
const getAllUsers = async ({ role, status, page = 1, limit = 20 } = {}) => {
    const where = {};

    if (role) {
        const validRoles = ["viewer", "analyst", "admin"];
        if (!validRoles.includes(role)) {
            const err = new Error(`Invalid role filter. Must be one of: ${validRoles.join(", ")}.`);
            err.statusCode = 400;
            throw err;
        }
        where.role = role;
    }

    if (status) {
        const validStatuses = ["active", "inactive"];
        if (!validStatuses.includes(status)) {
            const err = new Error(`Invalid status filter. Must be one of: ${validStatuses.join(", ")}.`);
            err.statusCode = 400;
            throw err;
        }
        where.status = status;
    }

    // ── Pagination 
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            where,
            select: USER_SELECT,
            orderBy: { createdAt: "desc" },
            skip,
            take: limitNum,
        }),
        prisma.user.count({ where }),
    ]);

    return {
        users,
        pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum),
        },
    };
};

// ─── Get Single User 

/**
 * Fetches a single user by ID.
 * @param {string} userId
 */
const getUserById = async (userId) => {
    if (!userId) {
        const err = new Error("User ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: USER_SELECT,
    });

    if (!user) {
        const err = new Error("User not found.");
        err.statusCode = 404;
        throw err;
    }

    return user;
};

// ─── Update User Status 

/**
 * Toggles user status between "active" and "inactive".
 * Prevents admin from deactivating themselves.
 *
 * @param {string} targetUserId  - ID of the user to update
 * @param {string} newStatus     - "active" | "inactive"
 * @param {string} requestingUserId - ID of the admin making the request
 */
const updateUserStatus = async (targetUserId, newStatus, requestingUserId) => {
    if (!targetUserId) {
        const err = new Error("User ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const statusCheck = validateStatus(newStatus);
    if (!statusCheck.valid) {
        const err = new Error(statusCheck.message);
        err.statusCode = 400;
        throw err;
    }

    // Prevent self-deactivation
    if (targetUserId === requestingUserId && newStatus === "inactive") {
        const err = new Error("Administrators cannot deactivate their own account.");
        err.statusCode = 400;
        throw err;
    }

    // Ensure target user exists
    const existing = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, status: true },
    });

    if (!existing) {
        const err = new Error("User not found.");
        err.statusCode = 404;
        throw err;
    }

    if (existing.status === newStatus) {
        const err = new Error(`User is already ${newStatus}.`);
        err.statusCode = 400;
        throw err;
    }

    const updated = await prisma.user.update({
        where: { id: targetUserId },
        data: { status: newStatus },
        select: USER_SELECT,
    });

    return updated;
};

module.exports = { getAllUsers, getUserById, updateUserStatus };
