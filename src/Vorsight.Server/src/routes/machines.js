const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db/database');
const { authenticateMachine } = require('../middleware/auth');

// Register a new machine
router.post('/register', (req, res) => {
    try {
        const { machineId, name, hostname, metadata } = req.body;

        if (!machineId || !name) {
            return res.status(400).json({ error: 'machineId and name are required' });
        }

        // Check if machine already exists
        const existing = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
        if (existing) {
            return res.json({
                success: true,
                apiKey: existing.api_key,
                machineId: existing.id,
                message: 'Machine already registered'
            });
        }

        // Generate API key
        const apiKey = crypto.randomBytes(32).toString('hex');

        // Insert machine
        db.prepare(`
      INSERT INTO machines (id, name, hostname, api_key, registration_date, metadata)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `).run(machineId, name, hostname, apiKey, JSON.stringify(metadata || {}));

        res.json({
            success: true,
            apiKey,
            machineId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Get all machines
router.get('/', (req, res) => {
    try {
        const machines = db.prepare('SELECT * FROM machines ORDER BY last_seen DESC').all();
        res.json(machines);
    } catch (error) {
        console.error('Get machines error:', error);
        res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

// Get single machine
router.get('/:id', (req, res) => {
    try {
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(req.params.id);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        res.json(machine);
    } catch (error) {
        console.error('Get machine error:', error);
        res.status(500).json({ error: 'Failed to fetch machine' });
    }
});

// Get machine state
router.get('/:id/state', (req, res) => {
    try {
        const state = db.prepare('SELECT * FROM machine_state WHERE machine_id = ?').get(req.params.id);
        res.json(state || {});
    } catch (error) {
        console.error('Get state error:', error);
        res.status(500).json({ error: 'Failed to fetch state' });
    }
});

// Update machine (authenticated)
router.put('/:id', authenticateMachine, (req, res) => {
    try {
        const { name, hostname, metadata } = req.body;

        db.prepare(`
      UPDATE machines 
      SET name = COALESCE(?, name),
          hostname = COALESCE(?, hostname),
          metadata = COALESCE(?, metadata)
      WHERE id = ?
    `).run(name, hostname, metadata ? JSON.stringify(metadata) : null, req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Update machine error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

module.exports = router;
