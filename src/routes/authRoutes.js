
const express = require("express");
const router = express.Router();
const { signup, login, getMe } = require("../controllers/authController");
const { authenticateUser } = require("../middleware/authMiddleware");

// POST /api/v1/auth/signup
router.post("/signup", signup);

// POST /api/v1/auth/login
router.post("/login", login);

// GET /api/v1/auth/me  — requires auth
router.get("/me", authenticateUser, getMe);

module.exports = router;
