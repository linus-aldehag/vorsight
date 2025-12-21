const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateMachine } = require('../middleware/auth');

// Get audit events for a machine
router.get('/:machineId', (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const events = db.prepare(`
      SELECT * FROM audit_events 
      WHERE machine_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `).all(req.params.machineId, parseInt(limit), parseInt(offset));

        res.json(events);
    } catch (error) {
        console.error('Get audit events error:', error);
        res.status(500).json({ error: 'Failed to fetch audit events' });
    }
});

// Get recent audit events for dashboard (exclude acknowledged)
router.get('/:machineId/recent', (req, res) => {
    try {
        const events = db.prepare(`
      SELECT * FROM audit_events 
      WHERE machine_id = ? AND acknowledged = 0
      ORDER BY timestamp DESC 
      LIMIT 10
    `).all(req.params.machineId);

        res.json(events);
    } catch (error) {
        console.error('Get recent audit events error:', error);
        res.status(500).json({ error: 'Failed to fetch recent audit events' });
    }
});

// Acknowledge (dismiss) an audit event
router.patch('/:id/acknowledge', (req, res) => {
    try {
        db.prepare('UPDATE audit_events SET acknowledged = 1 WHERE id = ?')
            .run(parseInt(req.params.id));

        res.json({ success: true });
    } catch (error) {
        console.error('Acknowledge audit event error:', error);
        res.status(500).json({ error: 'Failed to acknowledge audit event' });
    }
});

// Add audit event (authenticated)
router.post('/', authenticateMachine, (req, res) => {
    try {
        const { eventId, eventType, username, timestamp, details, sourceLogName, isFlagged } = req.body;

        db.prepare(`
      INSERT INTO audit_events (machine_id, event_id, event_type, username, timestamp, details, source_log_name, is_flagged)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.machine.id, eventId, eventType, username, timestamp, details, sourceLogName, isFlagged ? 1 : 0);

        res.json({ success: true });
    } catch (error) {
        console.error('Add audit event error:', error);
        res.status(500).json({ error: 'Failed to add audit event' });
    }
});

module.exports = router;
