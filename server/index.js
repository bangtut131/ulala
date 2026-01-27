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

apiRouter.use('/candidates', candidateRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/auth', authRoutes); // Admin Auth
apiRouter.use('/manpower', manpowerRoutes);
apiRouter.use('/portal/auth', portalAuthRoutes); // Portal Auth
apiRouter.use('/vacancies', vacancyRoutes); // Public & Admin Vacancies

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

// Only listen if run directly (not imported as a function)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
