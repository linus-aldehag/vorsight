const db = require('../db/database');
const jwt = require('jsonwebtoken');

function authenticateMachine(req, res, next) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }

    try {
        const machine = db.prepare('SELECT * FROM machines WHERE api_key = ?').get(apiKey);

        if (!machine) {
            return res.status(403).json({ error: 'Invalid API key' });
        }

        req.machine = machine;
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}

function authenticateBrowser(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

module.exports = { authenticateMachine, authenticateBrowser };
