const express = require('express');
const router = express.Router();
const { db } = require('../services/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// GET /api/manpower - List all requests
// Query Params: ?division=IT
// 1. Division Users: Only see their own requests
// 2. Admins: See ALL requests
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const filter = {};

        // If not admin, force filter by userId
        if (user.role !== 'admin') {
            filter.userId = user.id;
        }

        const requests = await db.manpowerRequest.findMany({ where: filter });
        res.json(requests);
    } catch (error) {
        console.error("Error fetching manpower requests:", error);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// POST /api/manpower - Create new request
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.manpowerRequest.create({
            data: {
                ...req.body,
                userId: userId
            }
        });
        res.json(result);
    } catch (error) {
        console.error("Error creating manpower request:", error);
        res.status(500).json({ error: "Failed to create request" });
    }
});

// PATCH /api/manpower/:id - Update status (Approve/Reject) or details
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[PATCH] Updating request ${id} with body:`, req.body);

        const result = await db.manpowerRequest.update({
            where: { id: parseInt(id) },
            data: req.body
        });
        console.log(`[PATCH] Update success:`, result);
        res.json(result);
    } catch (error) {
        console.error("Error updating manpower request:", error);
        res.status(500).json({ error: "Failed to update request: " + error.message });
    }
});

// DELETE /api/manpower/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        // Find the request first
        const request = await db.manpowerRequest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!request) {
            return res.status(404).json({ error: "Request not found" });
        }

        // Authorization Check
        // 1. Admins can delete anything
        // 2. Users can only delete their own PENDING requests
        if (user.role !== 'admin') {
            if (request.userId !== user.id) {
                return res.status(403).json({ error: "Unauthorized: You can only delete your own requests" });
            }
            if (request.status !== 'Pending') {
                return res.status(403).json({ error: "Cannot delete a request that is already being processed" });
            }
        }

        await db.manpowerRequest.delete({ where: { id: parseInt(id) } });
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting manpower request:", error);
        res.status(500).json({ error: "Failed to delete request" });
    }
});

module.exports = router;
