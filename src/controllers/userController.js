
const userService = require("../services/userService");

/**
 * GET /api/v1/users
 * Query params: role?, status?, page?, limit?
 */
const getAllUsers = async (req, res, next) => {
    try {
        const { role, status, page, limit } = req.query;
        const result = await userService.getAllUsers({ role, status, page, limit });

        res.status(200).json({
            success: true,
            message: "Users retrieved successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);

        res.status(200).json({
            success: true,
            message: "User retrieved successfully.",
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/v1/users/:id/status
 * Body: { status: "active" | "inactive" }
 */
const updateUserStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "Request body must include 'status' field.",
            });
        }

        const updated = await userService.updateUserStatus(
            req.params.id,
            status,
            req.user.id          // requesting admin's ID (for self-deactivation guard)
        );

        res.status(200).json({
            success: true,
            message: `User status updated to '${updated.status}'.`,
            data: { user: updated },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllUsers, getUserById, updateUserStatus };
