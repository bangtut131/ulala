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
app.use('/.netlify/functions/api', apiRouter);

// Only listen if run directly (not imported as a function)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
