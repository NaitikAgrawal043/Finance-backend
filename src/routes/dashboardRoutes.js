
const express = require("express");
const router = express.Router();
const {
    getSummary,
    getCategoryTotals,
    getRecentTransactions,
    getMonthlyTrends,
} = require("../controllers/dashboardController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All dashboard routes require auth
router.use(authenticateUser);

// GET /api/v1/dashboard/summary — all roles
router.get("/summary", authorizeRoles("viewer", "analyst", "admin"), getSummary);

// GET /api/v1/dashboard/recent?limit=10 — all roles
router.get("/recent", authorizeRoles("viewer", "analyst", "admin"), getRecentTransactions);

// GET /api/v1/dashboard/categories — analyst + admin
router.get("/categories", authorizeRoles("analyst", "admin"), getCategoryTotals);

// GET /api/v1/dashboard/trends?months=12 — analyst + admin
router.get("/trends", authorizeRoles("analyst", "admin"), getMonthlyTrends);

module.exports = router;
