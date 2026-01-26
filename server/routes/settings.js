const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../services/settings');

// GET: Read Settings
router.get('/', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (error) {
        console.error("Get Settings Route Error:", error);
    }
});

// GET: Read Divisions (Public/Portal use)
router.get('/divisions', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings.divisions || []);
    } catch (error) {
        console.error("Get Divisions Route Error:", error);
        res.status(500).json({ error: 'Failed to read divisions' });
    }
});

// POST: Update Settings
router.post('/', async (req, res) => {
    try {
        const success = await updateSettings(req.body);
        if (success) {
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Failed to save settings to database' });
        }
    } catch (error) {
        console.error("Save Settings Route Error:", error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
