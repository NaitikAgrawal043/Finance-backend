
const authService = require("../services/authService");

/**
 * POST /api/v1/auth/signup
 */
const signup = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required.",
            });
        }

        const result = await authService.signup({ name, email, password, role });

        res.status(201).json({
            success: true,
            message: "Account created successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Request body is required.",
            });
        }

        const result = await authService.login({ email, password });

        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user.
 */
const getMe = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: "Current user retrieved.",
            data: { user: req.user },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { signup, login, getMe };
