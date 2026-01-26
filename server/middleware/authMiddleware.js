const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_prod';

const authenticateToken = (req, res, next) => {
    // 1. Check Authorization Header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) return res.status(401).json({ error: 'Access token required' });

    // 2. Verify Token
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });

        // 3. Attach user to request
        req.user = user;
        // user = { id, username, division, role, iat, exp }
        next();
    });
};

module.exports = { authenticateToken, JWT_SECRET };
