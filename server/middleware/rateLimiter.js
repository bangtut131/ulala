const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes) - 'max' is deprecated in newer versions
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    validate: { xForwardedForHeader: false }, // Netlify handles this, suppress warning
    message: {
        status: 429,
        error: 'Too many requests, please try again later.'
    }
});

module.exports = limiter;
