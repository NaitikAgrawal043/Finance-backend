
const prisma = require("../config/db");
const { validateRecordInput } = require("../utils/validators");

// ─── Base filter: exclude soft-deleted records ────────────────────────────────
const ACTIVE_RECORDS = { deletedAt: null };

// ─── Build Prisma WHERE clause from query params ──────────────────────────────

/**
 * Builds a Prisma where clause from optional filter query params.
 * @param {object} filters
 * @param {string} [filters.type]
 * @param {string} [filters.category]
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.search]   – searches category + notes
 * @param {string} [userId]           – restrict to this user (non-admin)
 * @returns {object} Prisma where object
 */
const buildWhereClause = (filters = {}, userId = null) => {
    const { type, category, startDate, endDate, search } = filters;

    const where = { ...ACTIVE_RECORDS };

    // Scope to user unless admin
    if (userId) where.userId = userId;

    // Type filter
    if (type) {
        const validTypes = ["income", "expense"];
        if (!validTypes.includes(type.toLowerCase())) {
            const err = new Error(`Invalid type filter. Must be one of: ${validTypes.join(", ")}.`);
            err.statusCode = 400;
            throw err;
        }
        where.type = type.toLowerCase();
    }

    // Category filter (case-insensitive contains)
    if (category && category.trim()) {
        where.category = { contains: category.trim(), mode: "insensitive" };
    }

    // Date range filter
    if (startDate || endDate) {
        where.date = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                const err = new Error("startDate must be a valid ISO date string.");
                err.statusCode = 400;
                throw err;
            }
            where.date.gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                const err = new Error("endDate must be a valid ISO date string.");
                err.statusCode = 400;
                throw err;
            }
            // End of the provided day
            end.setHours(23, 59, 59, 999);
            where.date.lte = end;
        }
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            const err = new Error("startDate cannot be after endDate.");
            err.statusCode = 400;
            throw err;
        }
    }

    // Full-text search across category and notes
    if (search && search.trim()) {
        where.OR = [
            { category: { contains: search.trim(), mode: "insensitive" } },
            { notes: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    return where;
};

// ─── Create Record ────────────────────────────────────────────────────────────

/**
 * Creates a new financial record.
 * Only admin can call this — enforced at the router level.
 *
 * @param {{ amount, type, category, date, notes?, userId }} data
 * @returns {object} Created record
 */
const createRecord = async ({ amount, type, category, date, notes, userId }) => {
    // Validate all record fields
    const validationError = validateRecordInput({ amount, type, category, date, notes });
    if (validationError) {
        const err = new Error(validationError);
        err.statusCode = 400;
        throw err;
    }

    if (!userId) {
        const err = new Error("userId is required to create a record.");
        err.statusCode = 400;
        throw err;
    }

    // Ensure the target user exists
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
        const err = new Error("Cannot create record: referenced user does not exist.");
        err.statusCode = 404;
        throw err;
    }

    const record = await prisma.record.create({
        data: {
            userId,
            amount: parseFloat(amount),
            type: type.toLowerCase(),
            category: category.trim(),
            date: new Date(date),
            notes: notes ? notes.trim() : null,
        },
        include: { user: { select: { id: true, name: true, email: true } } },
    });

    return record;
};

// ─── Get Records ──────────────────────────────────────────────────────────────

/**
 * Retrieves records with optional filters and pagination.
 * Admins see all records; other roles see only their own.
 *
 * @param {{ userId, role }} requester - The requesting user
 * @param {{ type?, category?, startDate?, endDate?, search?, page?, limit? }} queryParams
 */
const getRecords = async (requester, queryParams = {}) => {
    const { userId, role } = requester;
    const { page = 1, limit = 10, ...filters } = queryParams;

    // Pagination guards
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Admin sees everything, others see own records only
    const scopedUserId = role === "admin" ? null : userId;
    const where = buildWhereClause(filters, scopedUserId);

    const [records, totalCount] = await Promise.all([
        prisma.record.findMany({
            where,
            orderBy: { date: "desc" },
            skip,
            take: limitNum,
            include: {
                user: { select: { id: true, name: true, email: true } },
            },
        }),
        prisma.record.count({ where }),
    ]);

    return {
        records,
        pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum),
        },
    };
};

// ─── Get Single Record ────────────────────────────────────────────────────────

/**
 * Fetches a single record by ID, enforcing ownership for non-admins.
 * @param {string} recordId
 * @param {{ userId, role }} requester
 */
const getRecordById = async (recordId, requester) => {
    if (!recordId) {
        const err = new Error("Record ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const record = await prisma.record.findFirst({
        where: {
            id: recordId,
            ...ACTIVE_RECORDS,
            ...(requester.role !== "admin" ? { userId: requester.userId } : {}),
        },
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    if (!record) {
        const err = new Error("Record not found or you do not have permission to view it.");
        err.statusCode = 404;
        throw err;
    }

    return record;
};

// ─── Update Record ────────────────────────────────────────────────────────────

/**
 * Updates fields of an existing (non-deleted) record.
 * Only admin can call this — enforced at router level.
 *
 * @param {string} recordId
 * @param {{ amount?, type?, category?, date?, notes? }} updates
 * @returns {object} Updated record
 */
const updateRecord = async (recordId, updates) => {
    if (!recordId) {
        const err = new Error("Record ID is required.");
        err.statusCode = 400;
        throw err;
    }

    // Can't update a soft-deleted record
    const existing = await prisma.record.findFirst({
        where: { id: recordId, ...ACTIVE_RECORDS },
        select: { id: true },
    });

    if (!existing) {
        const err = new Error("Record not found or has been deleted.");
        err.statusCode = 404;
        throw err;
    }

    // Validate only the fields being updated
    const { amount, type, category, date, notes } = updates;

    if (amount !== undefined) {
        const { validateAmount } = require("../utils/validators");
        const check = validateAmount(amount);
        if (!check.valid) {
            const err = new Error(check.message);
            err.statusCode = 400;
            throw err;
        }
    }

    if (type !== undefined) {
        const { validateType } = require("../utils/validators");
        const check = validateType(type);
        if (!check.valid) {
            const err = new Error(check.message);
            err.statusCode = 400;
            throw err;
        }
    }

    if (category !== undefined) {
        const { validateCategory } = require("../utils/validators");
        const check = validateCategory(category);
        if (!check.valid) {
            const err = new Error(check.message);
            err.statusCode = 400;
            throw err;
        }
    }

    if (date !== undefined) {
        const { validateDate } = require("../utils/validators");
        const check = validateDate(date);
        if (!check.valid) {
            const err = new Error(check.message);
            err.statusCode = 400;
            throw err;
        }
    }

    if (notes !== undefined && notes !== null) {
        if (typeof notes !== "string") {
            const err = new Error("Notes must be a string.");
            err.statusCode = 400;
            throw err;
        }
        if (notes.length > 500) {
            const err = new Error("Notes must not exceed 500 characters.");
            err.statusCode = 400;
            throw err;
        }
    }

    // Build update payload (only include provided fields)
    const data = {};
    if (amount !== undefined) data.amount = parseFloat(amount);
    if (type !== undefined) data.type = type.toLowerCase();
    if (category !== undefined) data.category = category.trim();
    if (date !== undefined) data.date = new Date(date);
    if (notes !== undefined) data.notes = notes ? notes.trim() : null;

    if (Object.keys(data).length === 0) {
        const err = new Error("No valid fields provided to update.");
        err.statusCode = 400;
        throw err;
    }

    const updated = await prisma.record.update({
        where: { id: recordId },
        data,
        include: {
            user: { select: { id: true, name: true, email: true } },
        },
    });

    return updated;
};

// ─── Soft Delete Record ───────────────────────────────────────────────────────

/**
 * Soft-deletes a record by setting deletedAt to the current timestamp.
 * Only admin can call this — enforced at router level.
 *
 * @param {string} recordId
 * @returns {{ message: string }}
 */
const softDeleteRecord = async (recordId) => {
    if (!recordId) {
        const err = new Error("Record ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const existing = await prisma.record.findFirst({
        where: { id: recordId, ...ACTIVE_RECORDS },
        select: { id: true },
    });

    if (!existing) {
        const err = new Error("Record not found or has already been deleted.");
        err.statusCode = 404;
        throw err;
    }

    await prisma.record.update({
        where: { id: recordId },
        data: { deletedAt: new Date() },
    });

    return { message: "Record deleted successfully." };
};

module.exports = {
    createRecord,
    getRecords,
    getRecordById,
    updateRecord,
    softDeleteRecord,
};
