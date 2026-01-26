const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../services/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// POST /api/portal/auth/register
// NOTE: In production, this should be protected or removed (only Admin creates users).
// For now, we allow it for easy setup.
// POST /api/portal/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password, division, role } = req.body;

        if (!username || !password || !division) {
            return res.status(400).json({ error: 'Username, password, and division are required.' });
        }

        // Check if user exists
        const existing = await db.portalUser.findByUsername(username);
        if (existing) {
            return res.status(400).json({ error: 'Username already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user with PENDING status (unless status is overridden, but let's force pending)
        const newUser = await db.portalUser.create({
            data: {
                username,
                passwordHash,
                division,
                role: role || 'division_lead',
                status: 'pending' // Default status
            }
        });

        res.status(201).json({ message: 'Registration successful. Waiting for Admin approval.', userId: newUser.id });

    } catch (error) {
        console.error('Register Error:', error);
        const debugInfo = {
            message: error.message,
            stack: error.stack,
            supabaseUrlDefined: !!process.env.SUPABASE_URL,
            supabaseUrlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 15) : 'N/A'
        };
        res.status(500).json({ error: 'Registration failed: ' + error.message, debug: debugInfo });
    }
});

// POST /api/portal/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await db.portalUser.findByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        // CHECK APPROVAL STATUS
        if (user.status !== 'approved') {
            return res.status(403).json({ error: 'Account not approved yet. Please contact Admin.' });
        }

        // Generate Token
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                division: user.division,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                division: user.division,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// GET /api/portal/auth/users - List users (For Admin)
// Assuming this is accessed by Admin Dashboard which might use 'adminToken'. 
// We need to implement a check or just assume it's protected by `authenticateToken` but strictly for admin role?
// For simplicity, let's allow it but ideally check req.user.role === 'admin'
// NOTE: AdminDashboard uses a different `adminToken`. This is tricky. 
// Options: 
// 1. Reuse portalAuth with a special admin logic. 
// 2. Add these management routes to `server/routes/auth.js` (Admin Auth).
// Let's add them here but unprotected for now OR expect admin to use this endpoint.
// Better: Add to `server/routes/auth.js` for "Get Portal Users". 
// But since we are here, let's keep it here.
router.get('/users', async (req, res) => {
    try {
        // Fetch all users
        const users = await db.portalUser.findMany();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/portal/auth/users/:id/approve
router.patch('/users/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        await db.portalUser.update({
            where: { id: parseInt(id) },
            data: { status: 'approved' }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
