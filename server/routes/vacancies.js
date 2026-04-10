const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db } = require('../services/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { supabaseAdmin } = require('../services/supabaseClient');

// Multer config for image upload (memory storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// POST /api/vacancies/upload-image - Upload image for vacancy
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const fileName = `vacancy_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
        const filePath = `vacancies/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabaseAdmin.storage
            .from('vacancy-images')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            console.error('Supabase Storage Upload Error:', error);
            return res.status(500).json({ error: 'Failed to upload image: ' + error.message });
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('vacancy-images')
            .getPublicUrl(filePath);

        res.json({ imageUrl: urlData.publicUrl });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Middleware for Admin check
const isAdmin = (req, res, next) => {
    // Assuming authenticateToken populates req.user
    // and admin token logic is separate. 
    // In this app, admin uses 'adminToken' and separate login.
    // We should check if the token used is an admin token.
    // For simplicity, we reuse the existing admin auth middleware logic from other routes if available.
    // Here we assume 'authenticateAdmin' might be needed or we check req.user properties.
    // If authenticateToken validates the JWT secret for admins:
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // If the token is valid but not admin (or if we have separate middleware)
        // Let's assume the router will use specific middleware.
        next();
    }
};

// ADMIN ROUTES

// Internal/Admin List (All vacancies including inactive)
router.get('/admin/all', authenticateToken, async (req, res) => {
    try {
        const vacancies = await db.jobVacancy.findMany({ where: { isAdmin: true } });
        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUBLIC ROUTES

// Get all active vacancies
router.get('/', async (req, res) => {
    try {
        const vacancies = await db.jobVacancy.findMany({ where: { public: true } });
        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single vacancy
router.get('/:id', async (req, res) => {
    try {
        const vacancy = await db.jobVacancy.findUnique({ where: { id: req.params.id, incrementView: true } });
        if (!vacancy) return res.status(404).json({ error: "Vacancy not found" });
        res.json(vacancy);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Vacancy (Publish)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const vacancy = await db.jobVacancy.create({ data: req.body });
        res.status(201).json(vacancy);
    } catch (error) {
        res.status(500).json({ error: error.message });
        console.log(error)
    }
});



// Update Vacancy
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const updated = await db.jobVacancy.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete Vacancy
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.jobVacancy.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
