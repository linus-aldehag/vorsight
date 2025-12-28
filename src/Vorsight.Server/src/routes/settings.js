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

        // Default settings
        const defaults = {
            screenshotIntervalSeconds: 300,
            pingIntervalSeconds: 30,
            isMonitoringEnabled: true
        };

        // Merge stored settings with defaults
        const storedSettings = (state && state.settings) ? JSON.parse(state.settings) : {};
        const mergedSettings = {
            ...defaults,
            ...storedSettings
        };

        res.json(mergedSettings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/settings
router.post('/', (req, res) => {
    try {
        const { machineId, ...newSettings } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get existing settings to preserve schedule
        const state = db.prepare('SELECT settings FROM machine_state WHERE machine_id = ?').get(machineId);
        let existingSettings = state && state.settings ? JSON.parse(state.settings) : {};

        // Merge new settings while preserving schedule
        const mergedSettings = {
            ...existingSettings,
            ...newSettings,
            // Preserve schedule if it exists
            schedule: existingSettings.schedule
        };

        // Save to machine_state
        db.prepare(`
      INSERT INTO machine_state (machine_id, settings, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(machine_id) DO UPDATE SET
        settings = excluded.settings,
        updated_at = excluded.updated_at
    `).run(machineId, JSON.stringify(mergedSettings));

        // Push settings update to client via WebSocket
        const io = req.app.get('io');
        io.to(`machine:${machineId}`).emit('server:settings_update', mergedSettings);

        res.json(mergedSettings); // Return merged settings, not just new ones
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: 'Failed to save settings', details: error.message });
    }
});

module.exports = router;
