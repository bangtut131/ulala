// Server Entry Point - Trigger Restart (Fix AI Visuals)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// const { PrismaClient } = require('@prisma/client');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
// const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1); // Trust Netlify Proxy

// Rate Limiter
// const limiter = require('./middleware/rateLimiter');
// Apply to all requests
// app.use(limiter);

// Serve uploaded files (if local)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const candidateRoutes = require('./routes/candidate');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const manpowerRoutes = require('./routes/manpower');

const portalAuthRoutes = require('./routes/portalAuth');
const vacancyRoutes = require('./routes/vacancies');
const employeeRoutes = require('./routes/employees');
const onboardingRoutes = require('./routes/onboarding');

// Debug Logging Middleware
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

const apiRouter = express.Router();

apiRouter.get('/ping', (req, res) => {
    res.json({
        message: 'pong',
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl
    });
});

apiRouter.get('/keepalive', async (req, res) => {
    try {
        const { supabase } = require('./services/supabaseClient');
        // Simple query to keep Supabase awake
        const { data, error } = await supabase.from('app_settings').select('id').limit(1);
        if (error) throw error;

        res.json({
            status: 'ok',
            message: 'Supabase connection is active. Keep-alive successful.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Keepalive ping failed:', error.message);
        res.status(500).json({ status: 'error', message: 'Keep-alive ping failed' });
    }
});

apiRouter.use('/candidates', candidateRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/auth', authRoutes); // Admin Auth
apiRouter.use('/manpower', manpowerRoutes);
apiRouter.use('/portal/auth', portalAuthRoutes); // Portal Auth
apiRouter.use('/vacancies', vacancyRoutes); // Public & Admin Vacancies
apiRouter.use('/employees', employeeRoutes); // Employee Database
apiRouter.use('/onboarding', onboardingRoutes); // Onboarding Portal

app.use('/api', apiRouter);
// Netlify Functions Path - Handle both with and without trailing slash
// Netlify Functions Path - Handle both with and without trailing slash
app.use('/.netlify/functions/api', apiRouter);

// --- SERVE FRONTEND (Railway/VPS specific) ---
const clientBuildPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuildPath)) {
    console.log("Serving Frontend from:", clientBuildPath);
    app.use(express.static(clientBuildPath));

    // Catch-all: serve index.html for SPA routing
    // Note: Express 5 requires regex for wildcard or different syntax
    app.get(/.*/, (req, res) => {
        // Skip API calls - they should have matched apiRouter above
        if (req.url.startsWith('/api') || req.url.startsWith('/.netlify')) {
            return res.status(404).json({ error: 'API Route Not Found' });
        }
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    console.warn("Client build not found at:", clientBuildPath);
}

// --- AUTOMATIC KEEPALIVE INTERVAL (For VPS/Railway) ---
// Supabase free tier pauses after 7 days of inactivity.
// This pings the DB every 3 days to keep it alive.
const KEEPALIVE_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 Days
setInterval(async () => {
    try {
        console.log('[Keep-Alive] Pinging Supabase to prevent pause...');
        const { supabase } = require('./services/supabaseClient');
        await supabase.from('app_settings').select('id').limit(1);
        console.log('[Keep-Alive] Ping successful.');
    } catch (e) {
        console.error('[Keep-Alive] Ping failed:', e.message);
    }
}, KEEPALIVE_INTERVAL_MS);

// --- DAILY PROBATION STATUS CHECK ---
const DAILY_CHECK_MS = 24 * 60 * 60 * 1000; // 24 hours
setTimeout(async () => {
    // Run once on startup (delayed 30s to let server settle)
    try {
        const { checkProbationStatus } = require('./services/employeeService');
        await checkProbationStatus();
    } catch (e) { console.error('[Probation Check] Startup check failed:', e.message); }
}, 30000);
setInterval(async () => {
    try {
        console.log('[Probation Check] Running daily probation status check...');
        const { checkProbationStatus } = require('./services/employeeService');
        await checkProbationStatus();
    } catch (e) { console.error('[Probation Check] Failed:', e.message); }
}, DAILY_CHECK_MS);

// Only listen if run directly (not imported as a function)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
