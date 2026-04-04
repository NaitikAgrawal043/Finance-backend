
const dashboardService = require("../services/dashboardService");

/**
 * GET /api/v1/dashboard/summary
 * Accessible to all authenticated users.
 */
const getSummary = async (req, res, next) => {
    try {
        const summary = await dashboardService.getSummary({
            userId: req.user.id,
            role: req.user.role,
        });

        res.status(200).json({
            success: true,
            message: "Dashboard summary retrieved successfully.",
            data: summary,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/dashboard/categories
 * Analyst + Admin only.
 */
const getCategoryTotals = async (req, res, next) => {
    try {
        const categories = await dashboardService.getCategoryTotals({
            userId: req.user.id,
            role: req.user.role,
        });

        res.status(200).json({
            success: true,
            message: "Category totals retrieved successfully.",
            data: { categories },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/dashboard/recent
 * Query: limit? (default 10, max 50)
 * All authenticated users.
 */
const getRecentTransactions = async (req, res, next) => {
    try {
        const { limit } = req.query;
        const records = await dashboardService.getRecentTransactions(
            { userId: req.user.id, role: req.user.role },
            limit
        );

        res.status(200).json({
            success: true,
            message: "Recent transactions retrieved successfully.",
            data: { records },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/dashboard/trends
 * Analyst + Admin only.
 * Query: months? (default 12, max 36)
 */
const getMonthlyTrends = async (req, res, next) => {
    try {
        const { months } = req.query;
        const trends = await dashboardService.getMonthlyTrends(
            { userId: req.user.id, role: req.user.role },
            months
        );

        res.status(200).json({
            success: true,
            message: "Monthly trends retrieved successfully.",
            data: { trends },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSummary,
    getCategoryTotals,
    getRecentTransactions,
    getMonthlyTrends,
};
