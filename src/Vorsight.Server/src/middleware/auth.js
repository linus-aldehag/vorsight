const db = require('../db/database');

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

module.exports = { authenticateMachine };
