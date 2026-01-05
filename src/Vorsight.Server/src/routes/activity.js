const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateMachine } = require('../middleware/auth');

// Get activity summary (legacy endpoint - returns empty for now)
router.get('/summary', (req, res) => {
    res.json([]);
});

// Get activity sessions for a machine
router.get('/:machineId', (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const sessions = db.prepare(`
      SELECT * FROM activity_sessions 
      WHERE machine_id = ? 
      ORDER BY start_time DESC 
      LIMIT ? OFFSET ?
    `).all(req.params.machineId, parseInt(limit), parseInt(offset));

        // Convert to frontend format (timestamp = start_time for compatibility)
        const formatted = sessions.map(s => ({
            id: s.id,
            machine_id: s.machine_id,
            timestamp: s.start_time,
            active_window: s.active_window,
            process_name: s.process_name,
            duration: s.duration_seconds,
            username: s.username
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

// Add activity heartbeat (authenticated) - processes into sessions
router.post('/', authenticateMachine, (req, res) => {
    try {
        const { timestamp, activeWindow, processName, username, pingIntervalSeconds = 30 } = req.body;
        const machineId = req.machine.id;

        // Store raw heartbeat for debugging (optional, short retention)
        db.prepare(`
      INSERT INTO activity_history (machine_id, timestamp, active_window, process_name, username)
      VALUES (?, ?, ?, ?, ?)
    `).run(machineId, timestamp, activeWindow, processName, username);

        // Get most recent session for this machine
        const recentSession = db.prepare(`
      SELECT * FROM activity_sessions 
      WHERE machine_id = ? 
      ORDER BY end_time DESC 
      LIMIT 1
    `).get(machineId);

        const currentTime = Math.floor(Date.now() / 1000);
        const heartbeatTime = timestamp || currentTime;

        // Determine if we should extend existing session or create new one
        const shouldExtend = recentSession &&
            recentSession.process_name === processName &&
            recentSession.active_window === activeWindow &&
            (heartbeatTime - recentSession.end_time) <= (pingIntervalSeconds * 2); // Allow 2x ping interval grace

        if (shouldExtend) {
            // Extend existing session
            const newEndTime = heartbeatTime;
            const newDuration = newEndTime - recentSession.start_time;
            const newHeartbeatCount = recentSession.heartbeat_count + 1;

            db.prepare(`
        UPDATE activity_sessions 
        SET end_time = ?, 
            duration_seconds = ?,
            heartbeat_count = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newEndTime, newDuration, newHeartbeatCount, recentSession.id);

            console.log(`Extended session ${recentSession.id} to ${newDuration}s (${newHeartbeatCount} heartbeats)`);
        } else {
            // Create new session
            const newSession = db.prepare(`
        INSERT INTO activity_sessions 
          (machine_id, start_time, end_time, duration_seconds, process_name, active_window, username, heartbeat_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `).run(machineId, heartbeatTime, heartbeatTime, 0, processName, activeWindow, username);

            console.log(`Created new session ${newSession.lastInsertRowid} for ${processName}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Add activity error:', error);
        res.status(500).json({ error: 'Failed to add activity' });
    }
});

module.exports = router;
