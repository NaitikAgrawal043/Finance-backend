const Record = require("../models/Record");
const User = require("../models/User");
const { validateRecordInput } = require("../utils/validators");

// ─── Base filter: exclude soft-deleted records ────────────────────────────────
const ACTIVE_RECORDS = { deletedAt: null };

// ─── Format Record to match previous Prisma shape ─────────────────────────────
const formatRecord = (doc) => {
    if (!doc) return doc;
    const obj = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
    if (obj.userId && typeof obj.userId === "object") {
        obj.user = obj.userId;
        obj.userId = obj.user.id || obj.user._id;
    }
    return obj;
};

// ─── Build Mongoose WHERE clause from query params ──────────────────────────────

const buildWhereClause = (filters = {}, userId = null) => {
    const { type, category, startDate, endDate, search } = filters;

    const where = { ...ACTIVE_RECORDS };

    if (userId) where.userId = userId;

    if (type) {
        const validTypes = ["income", "expense"];
        if (!validTypes.includes(type.toLowerCase())) {
            const err = new Error(`Invalid type filter. Must be one of: ${validTypes.join(", ")}.`);
            err.statusCode = 400;
            throw err;
        }
        where.type = type.toLowerCase();
    }

    if (category && category.trim()) {
        where.category = { $regex: category.trim(), $options: "i" };
    }

    if (startDate || endDate) {
        where.date = {};
        if (startDate) {
            const start = new Date(startDate);
            if (isNaN(start.getTime())) {
                const err = new Error("startDate must be a valid ISO date string.");
                err.statusCode = 400;
                throw err;
            }
            where.date.$gte = start;
        }
        if (endDate) {
            const end = new Date(endDate);
            if (isNaN(end.getTime())) {
                const err = new Error("endDate must be a valid ISO date string.");
                err.statusCode = 400;
                throw err;
            }
            end.setHours(23, 59, 59, 999);
            where.date.$lte = end;
        }
    }

    if (search && search.trim()) {
        where.$or = [
            { category: { $regex: search.trim(), $options: "i" } },
            { notes: { $regex: search.trim(), $options: "i" } },
        ];
    }

    return where;
};

// ─── Create Record ────────────────────────────────────────────────────────────

const createRecord = async ({ amount, type, category, date, notes, userId }) => {
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

    const user = await User.findById(userId).select("id");
    if (!user) {
        const err = new Error("Cannot create record: referenced user does not exist.");
        err.statusCode = 404;
        throw err;
    }

    const record = await Record.create({
        userId,
        amount: parseFloat(amount),
        type: type.toLowerCase(),
        category: category.trim(),
        date: new Date(date),
        notes: notes ? notes.trim() : null,
    });

    const populatedRecord = await Record.findById(record._id).populate("userId", "name email");
    return formatRecord(populatedRecord);
};

// ─── Get Records ──────────────────────────────────────────────────────────────

const getRecords = async (requester, queryParams = {}) => {
    const { userId, role } = requester;
    const { page = 1, limit = 10, ...filters } = queryParams;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    const scopedUserId = role === "admin" ? null : userId;
    const where = buildWhereClause(filters, scopedUserId);

    const [records, totalCount] = await Promise.all([
        Record.find(where)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate("userId", "name email"),
        Record.countDocuments(where),
    ]);

    return {
        records: records.map(formatRecord),
        pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum),
        },
    };
};

// ─── Get Single Record ────────────────────────────────────────────────────────

const getRecordById = async (recordId, requester) => {
    if (!recordId) {
        const err = new Error("Record ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const where = {
        _id: recordId,
        ...ACTIVE_RECORDS,
        ...(requester.role !== "admin" ? { userId: requester.userId } : {}),
    };

    const record = await Record.findOne(where).populate("userId", "name email");

    if (!record) {
        const err = new Error("Record not found or you do not have permission to view it.");
        err.statusCode = 404;
        throw err;
    }

    return formatRecord(record);
};

// ─── Update Record ────────────────────────────────────────────────────────────

const updateRecord = async (recordId, updates) => {
    if (!recordId) {
        const err = new Error("Record ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const existing = await Record.findOne({ _id: recordId, ...ACTIVE_RECORDS }).select("id");
    if (!existing) {
        const err = new Error("Record not found or has been deleted.");
        err.statusCode = 404;
        throw err;
    }

    const { amount, type, category, date, notes } = updates;

    // Validation
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

    const updated = await Record.findByIdAndUpdate(recordId, data, { new: true }).populate("userId", "name email");

    return formatRecord(updated);
};

// ─── Soft Delete Record ───────────────────────────────────────────────────────

const softDeleteRecord = async (recordId) => {
    if (!recordId) {
        const err = new Error("Record ID is required.");
        err.statusCode = 400;
        throw err;
    }

    const existing = await Record.findOne({ _id: recordId, ...ACTIVE_RECORDS }).select("id");
    if (!existing) {
        const err = new Error("Record not found or has already been deleted.");
        err.statusCode = 404;
        throw err;
    }

    await Record.findByIdAndUpdate(recordId, { deletedAt: new Date() });

    return { message: "Record deleted successfully." };
};

module.exports = {
    createRecord,
    getRecords,
    getRecordById,
    updateRecord,
    softDeleteRecord,
};
