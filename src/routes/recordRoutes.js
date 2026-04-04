
const express = require("express");
const router = express.Router();
const {
    createRecord,
    getRecords,
    getRecordById,
    updateRecord,
    deleteRecord,
} = require("../controllers/recordController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// All routes require a valid JWT
router.use(authenticateUser);

// POST /api/v1/records — admin only
router.post("/", authorizeRoles("admin"), createRecord);

// GET /api/v1/records — all authenticated roles
// Query: type, category, startDate, endDate, search, page, limit
router.get("/", authorizeRoles("admin", "analyst", "viewer"), getRecords);

// GET /api/v1/records/:id
router.get("/:id", authorizeRoles("admin", "analyst", "viewer"), getRecordById);

// PUT /api/v1/records/:id — admin only
router.put("/:id", authorizeRoles("admin"), updateRecord);

// DELETE /api/v1/records/:id — admin only (soft delete)
router.delete("/:id", authorizeRoles("admin"), deleteRecord);

module.exports = router;
