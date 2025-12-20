const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/settings?machineId=xxx
router.get('/', (req, res) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            // Return default settings if no machine specified
            return res.json({
                screenshotIntervalSeconds: 300,
                pingIntervalSeconds: 30,
                isMonitoringEnabled: true
            });
        }

        // Get settings from machine_state
        const state = db.prepare('SELECT settings FROM machine_state WHERE machine_id = ?').get(machineId);

        if (state && state.settings) {
            res.json(JSON.parse(state.settings));
        } else {
            // Return defaults if no settings stored
            res.json({
                screenshotIntervalSeconds: 300,
                pingIntervalSeconds: 30,
                isMonitoringEnabled: true
            });
        }
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/settings
router.post('/', (req, res) => {
    try {
        const { machineId, ...settings } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Save to machine_state
        db.prepare(`
      INSERT INTO machine_state (machine_id, settings, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(machine_id) DO UPDATE SET
        settings = excluded.settings,
        updated_at = excluded.updated_at
    `).run(machineId, JSON.stringify(settings));

        // TODO: Push to client via WebSocket
        // io.to(`machine:${machineId}`).emit('server:settings_update', settings);

        res.json(settings);
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
