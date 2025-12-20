const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get latest screenshot (legacy endpoint)
router.get('/latest', (req, res) => {
    res.json(null); // No screenshots yet
});

// Get screenshots for a machine
router.get('/:machineId', (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const screenshots = db.prepare(`
      SELECT * FROM screenshots 
      WHERE machine_id = ? 
      ORDER BY capture_time DESC 
      LIMIT ?
    `).all(req.params.machineId, parseInt(limit));

        res.json(screenshots);
    } catch (error) {
        console.error('Get screenshots error:', error);
        res.status(500).json({ error: 'Failed to fetch screenshots' });
    }
});

module.exports = router;
