
const express = require("express");
const router = express.Router();
const {
    getAllUsers,
    getUserById,
    updateUserStatus,
} = require("../controllers/userController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require authentication and admin role
router.use(authenticateUser, authorizeRoles("admin"));

// GET /api/v1/users?role=&status=&page=&limit=
router.get("/", getAllUsers);

// GET /api/v1/users/:id
router.get("/:id", getUserById);

// PATCH /api/v1/users/:id/status
// Body: { status: "active" | "inactive" }
router.patch("/:id/status", updateUserStatus);

module.exports = router;
