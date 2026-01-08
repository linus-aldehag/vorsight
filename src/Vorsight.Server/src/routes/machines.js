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
        const { status, includeArchived } = req.query;
        let query = 'SELECT * FROM machines';
        let params = [];
        let conditions = [];

        // Filter by status if provided
        if (status) {
            conditions.push('status = ?');
            params.push(status);
        } else if (includeArchived !== 'true') {
            // By default, exclude archived machines
            conditions.push('status != ?');
            params.push('archived');
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY last_seen DESC';

        const rows = db.prepare(query).all(...params);
        const machines = rows.map(row => {
            const lastSeen = row.last_seen ? new Date(row.last_seen + 'Z') : null; // Ensure UTC interpretation if needed
            // 90 seconds timeout (3x default ping interval of 30s)
            const isOnline = lastSeen && (Date.now() - new Date(row.last_seen).getTime() < 90000);

            return {
                id: row.id,
                name: row.name,
                displayName: row.displayName,
                hostname: row.hostname,
                lastSeen: row.last_seen,
                isOnline: !!isOnline,
                status: row.status || 'active',
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            };
        });
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

// Update machine display name (no auth required for now - could add later)
router.patch('/:id/display-name', (req, res) => {
    try {
        const { displayName } = req.body;

        // Validate displayName if provided
        if (displayName !== undefined && displayName !== null) {
            if (typeof displayName !== 'string') {
                return res.status(400).json({ error: 'Display name must be a string' });
            }
            if (displayName.trim().length === 0) {
                // Empty string - reset to null
                db.prepare('UPDATE machines SET displayName = NULL WHERE id = ?')
                    .run(req.params.id);
                return res.json({ success: true, displayName: null });
            }
        }

        db.prepare('UPDATE machines SET displayName = ? WHERE id = ?')
            .run(displayName || null, req.params.id);

        res.json({ success: true, displayName: displayName || null });
    } catch (error) {
        console.error('Update display name error:', error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Adopt a pending machine
router.post('/:id/adopt', (req, res) => {
    try {
        const { displayName, enableScreenshots, enableActivity, enableAudit } = req.body;
        const machineId = req.params.id;

        // Verify machine exists and is pending
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        if (machine.status === 'active') {
            return res.status(400).json({ error: 'Machine already adopted' });
        }

        // Update machine status to active and set display name
        db.prepare('UPDATE machines SET status = ?, displayName = ? WHERE id = ?')
            .run('active', displayName || null, machineId);

        // Create initial settings based on selected features
        const initialSettings = {
            screenshotIntervalSeconds: enableScreenshots ? 300 : 0,
            pingIntervalSeconds: enableActivity ? 30 : 0,
            isMonitoringEnabled: enableScreenshots || enableActivity,
            isAuditEnabled: !!enableAudit
        };

        // Store settings in machine_state
        db.prepare(`
            INSERT INTO machine_state (machine_id, settings, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(machine_id) DO UPDATE SET
                settings = excluded.settings,
                updated_at = excluded.updated_at
        `).run(machineId, JSON.stringify(initialSettings));

        // Emit WebSocket event for machine adoption
        const io = req.app.get('io');
        if (io) {
            io.emit('machine:adopted', {
                machineId,
                name: machine.name,
                displayName,
                timestamp: new Date().toISOString()
            });
            // Also send updated machines list
            io.emit('web:subscribe');
        }

        console.log(`✓ Machine adopted: ${displayName || machine.name} (${machineId})`);

        res.json({
            success: true,
            machineId,
            displayName,
            settings: initialSettings
        });
    } catch (error) {
        console.error('Adopt machine error:', error);
        res.status(500).json({ error: 'Adoption failed' });
    }
});

// Archive a machine
router.patch('/:id/archive', (req, res) => {
    try {
        const machineId = req.params.id;

        // Verify machine exists
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        if (machine.status === 'archived') {
            return res.status(400).json({ error: 'Machine already archived' });
        }

        // Update machine status to archived
        db.prepare('UPDATE machines SET status = ? WHERE id = ?')
            .run('archived', machineId);

        // Log connection event
        db.prepare('INSERT INTO connection_events (machine_id, event_type, metadata) VALUES (?, ?, ?)')
            .run(machineId, 'Archived', JSON.stringify({ archivedAt: new Date().toISOString() }));

        // Emit WebSocket event to notify the Service if it's connected
        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('machine:archived', {
                machineId,
                timestamp: new Date().toISOString()
            });

            // Also broadcast updated machines list to all web clients
            io.emit('web:subscribe');
        }

        console.log(`✓ Machine archived: ${machine.displayName || machine.name} (${machineId})`);

        res.json({
            success: true,
            machineId,
            status: 'archived'
        });
    } catch (error) {
        console.error('Archive machine error:', error);
        res.status(500).json({ error: 'Archive failed' });
    }
});

// Un-archive a machine
router.patch('/:id/unarchive', (req, res) => {
    try {
        const machineId = req.params.id;

        // Verify machine exists
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        if (machine.status !== 'archived') {
            return res.status(400).json({ error: 'Machine is not archived' });
        }

        // Update machine status back to active
        db.prepare('UPDATE machines SET status = ? WHERE id = ?')
            .run('active', machineId);

        // Log connection event
        db.prepare('INSERT INTO connection_events (machine_id, event_type, metadata) VALUES (?, ?, ?)')
            .run(machineId, 'Unarchived', JSON.stringify({ unarchivedAt: new Date().toISOString() }));

        // Emit WebSocket event to notify the Service if it's connected
        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('machine:unarchived', {
                machineId,
                timestamp: new Date().toISOString()
            });

            // Also broadcast updated machines list to all web clients
            io.emit('web:subscribe');
        }

        console.log(`✓ Machine un-archived: ${machine.displayName || machine.name} (${machineId})`);

        res.json({
            success: true,
            machineId,
            status: 'active'
        });
    } catch (error) {
        console.error('Un-archive machine error:', error);
        res.status(500).json({ error: 'Un-archive failed' });
    }
});

module.exports = router;
