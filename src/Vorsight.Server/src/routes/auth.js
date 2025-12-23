const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Login with passphrase
router.post('/login', (req, res) => {
    const { passphrase } = req.body;

    if (!passphrase) {
        return res.status(400).json({ error: 'Passphrase required' });
    }

    if (passphrase === process.env.WEB_PASSPHRASE) {
        const token = jwt.sign(
            { role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '30d' }
        );

        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid passphrase' });
    }
});

// Check authentication status
router.get('/status', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ authenticated: false });
    }

    try {
        jwt.verify(token, process.env.JWT_SECRET);
        res.json({ authenticated: true });
    } catch (error) {
        res.status(401).json({ authenticated: false });
    }
});

module.exports = router;
