const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { getSettings, updateSettings } = require('../services/settings');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        const settings = await getSettings();
        const adminPassword = settings.adminPassword || process.env.ADMIN_PASSWORD || 'admin123';

        if (password === adminPassword) {
            const token = jwt.sign(
                { id: 'admin', username: 'admin', role: 'admin' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            return res.json({ success: true, token });
        }
        return res.status(401).json({ success: false, message: 'Password salah' });
    } catch (error) {
        console.error("Login Route Error:", error);
        return res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

// Change Password
router.post('/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const settings = await getSettings();
    const currentPassword = settings.adminPassword || process.env.ADMIN_PASSWORD || 'admin123';

    if (oldPassword !== currentPassword) {
        return res.status(401).json({ success: false, message: 'Password lama salah' });
    }

    await updateSettings({ adminPassword: newPassword });

    res.json({ success: true, message: 'Password berhasil diubah' });
});

// Start OAuth Flow
router.get('/google', async (req, res) => {
    const settings = await getSettings();

    // Check if credentials exist
    if (!settings.googleClientId || !settings.googleClientSecret) {
        return res.status(400).send('Missing Google Client ID or Secret in Settings. Please configure them in Admin Settings first.');
    }

    const oauth2Client = new google.auth.OAuth2(
        settings.googleClientId,
        settings.googleClientSecret,
        // The callback URL must match exactly what is in Google Cloud Console
        // For Netlify, this should be the Netlify URL + /api/auth/google/callback
        // For local, localhost. 
        // Ideally we store the BASE_URL in settings or env.
        process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/api/auth/google/callback` : 'http://localhost:3000/api/auth/google/callback'
    );

    const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for getting refresh_token
        scope: scopes,
        prompt: 'consent' // Force consent to ensure refresh_token is returned
    });

    res.redirect(url);
});

// Callback
router.get('/google/callback', async (req, res) => {
    const { code } = req.query;
    const settings = await getSettings();

    try {
        const oauth2Client = new google.auth.OAuth2(
            settings.googleClientId,
            settings.googleClientSecret,
            process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}/api/auth/google/callback` : 'http://localhost:3000/api/auth/google/callback'
        );

        const { tokens } = await oauth2Client.getToken(code);

        // Save tokens to settings DB
        await updateSettings({ googleRefreshToken: tokens.refresh_token });

        console.log('Google Auth Successful. Refresh Token saved to DB.');

        // Redirect back to frontend
        // Assuming Standard Vite port or deployed URL logic
        const redirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${redirectUrl}/admin/settings?status=success`);

    } catch (error) {
        console.error('Error in Google Auth Callback:', error);
        res.status(500).send('Authentication Failed: ' + error.message);
    }
});

module.exports = router;
