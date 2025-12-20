const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateMachine } = require('../middleware/auth');

// Get activity summary (legacy endpoint - returns empty for now)
router.get('/summary', (req, res) => {
    res.json([]);
});

// Get activity for a machine
router.get('/:machineId', (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const activities = db.prepare(`
      SELECT * FROM activity_history 
      WHERE machine_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(req.params.machineId, parseInt(limit), parseInt(offset));

        res.json(activities);
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Add activity (authenticated)
router.post('/', authenticateMachine, (req, res) => {
    try {
        const { timestamp, activeWindow, processName, duration } = req.body;

        db.prepare(`
      INSERT INTO activity_history (machine_id, timestamp, active_window, process_name, duration)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.machine.id, timestamp, activeWindow, processName, duration);

        res.json({ success: true });
    } catch (error) {
        console.error('Add activity error:', error);
        res.status(500).json({ error: 'Failed to add activity' });
    }
});

module.exports = router;
