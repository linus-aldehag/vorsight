const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/schedule?machineId=xxx
router.get('/', (req, res) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            return res.json(null); // No schedule if no machine specified
        }

        // Get settings from machine_state (schedule is part of settings)
        const state = db.prepare('SELECT settings FROM machine_state WHERE machine_id = ?').get(machineId);

        if (state && state.settings) {
            const settings = JSON.parse(state.settings);
            // Extract schedule-related fields
            res.json(settings.schedule || null);
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error('Get schedule error:', error);
        res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

// POST /api/schedule
router.post('/', (req, res) => {
    try {
        const { machineId, ...schedule } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get existing settings
        const state = db.prepare('SELECT settings FROM machine_state WHERE machine_id = ?').get(machineId);
        let settings = state && state.settings ? JSON.parse(state.settings) : {};

        // Update schedule
        settings.schedule = schedule;

        // Save back to database
        db.prepare(`
      INSERT INTO machine_state (machine_id, settings, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(machine_id) DO UPDATE SET
        settings = excluded.settings,
        updated_at = excluded.updated_at
    `).run(machineId, JSON.stringify(settings));

        // TODO: Push to client via WebSocket

        res.json(schedule);
    } catch (error) {
        console.error('Save schedule error:', error);
        res.status(500).json({ error: 'Failed to save schedule' });
    }
});

module.exports = router;
