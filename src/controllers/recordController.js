
const recordService = require("../services/recordService");

/**
 * POST /api/v1/records
 * Admin only. Creates a record for any user.
 * Body: { amount, type, category, date, notes?, userId }
 */
const createRecord = async (req, res, next) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required.",
            });
        }

        const { amount, type, category, date, notes, userId } = req.body;

        const record = await recordService.createRecord({
            amount,
            type,
            category,
            date,
            notes,
            userId,
        });

        res.status(201).json({
            success: true,
            message: "Record created successfully.",
            data: { record },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/records
 * Admin → all records; others → own records only.
 * Query params: type?, category?, startDate?, endDate?, search?, page?, limit?
 */
const getRecords = async (req, res, next) => {
    try {
        const result = await recordService.getRecords(
            { userId: req.user.id, role: req.user.role },
            req.query
        );

        res.status(200).json({
            success: true,
            message: "Records retrieved successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/records/:id
 */
const getRecordById = async (req, res, next) => {
    try {
        const record = await recordService.getRecordById(req.params.id, {
            userId: req.user.id,
            role: req.user.role,
        });

        res.status(200).json({
            success: true,
            message: "Record retrieved successfully.",
            data: { record },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PUT /api/v1/records/:id
 * Admin only.
 * Body: any subset of { amount, type, category, date, notes }
 */
const updateRecord = async (req, res, next) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body with at least one field to update is required.",
            });
        }

        const record = await recordService.updateRecord(req.params.id, req.body);

        res.status(200).json({
            success: true,
            message: "Record updated successfully.",
            data: { record },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/v1/records/:id
 * Admin only. Soft delete.
 */
const deleteRecord = async (req, res, next) => {
    try {
        const result = await recordService.softDeleteRecord(req.params.id);

        res.status(200).json({
            success: true,
            message: result.message,
            data: null,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createRecord,
    getRecords,
    getRecordById,
    updateRecord,
    deleteRecord,
};
