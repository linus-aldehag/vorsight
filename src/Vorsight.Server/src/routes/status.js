const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/status - Get system status for selected machine
router.get('/', (req, res) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            // Return default status if no machine specified
            return res.json({
                health: {
                    screenshotsSuccessful: 0,
                    screenshotsFailed: 0,
                    uploadsSuccessful: 0,
                    uploadsFailed: 0,
                    totalScreenshotsSuccessful: 0,
                    totalScreenshotsFailed: 0,
                    totalUploadsSuccessful: 0,
                    totalUploadsFailed: 0,
                    periodDuration: '00:00:00',
                    totalRuntime: '00:00:00'
                },
                uptime: {
                    currentStart: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    isTracking: true
                },
                activity: null,
                audit: null
            });
        }

        // Get machine state
        const machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(machineId);
        const state = db.prepare('SELECT * FROM machine_state WHERE machine_id = ?').get(machineId);

        // Get screenshot count
        const screenshotCount = db.prepare('SELECT COUNT(*) as count FROM screenshots WHERE machine_id = ?').get(machineId);

        // Get latest activity
        const latestActivity = db.prepare(`
      SELECT * FROM activity_history 
      WHERE machine_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(machineId);

        // Calculate online status from last_seen (online if seen within last 5 minutes)
        const isOnline = machine?.last_seen
            ? (new Date() - new Date(machine.last_seen + 'Z')) < 5 * 60 * 1000
            : false;

        // Get ping status from machine_state (for offline machines)
        const machineState = db.prepare('SELECT health_status FROM machine_state WHERE machine_id = ?').get(machineId);
        const pingStatus = machineState?.health_status;

        // Determine connection state
        let connectionState = 'offline';
        if (isOnline) {
            connectionState = 'online';
        } else if (pingStatus === 'reachable') {
            connectionState = 'reachable'; // Machine online but service down
        }

        res.json({
            health: {
                screenshotsSuccessful: screenshotCount?.count || 0,
                screenshotsFailed: 0,
                uploadsSuccessful: screenshotCount?.count || 0,
                uploadsFailed: 0,
                totalScreenshotsSuccessful: screenshotCount?.count || 0,
                totalScreenshotsFailed: 0,
                totalUploadsSuccessful: screenshotCount?.count || 0,
                totalUploadsFailed: 0,
                periodDuration: '00:00:00',
                totalRuntime: '00:00:00'
            },
            uptime: {
                currentStart: machine?.registration_date || new Date().toISOString(),
                lastSeen: machine?.last_seen || new Date().toISOString(),
                isTracking: isOnline
            },
            activity: latestActivity ? {
                activeWindowTitle: latestActivity.active_window,
                timeSinceLastInput: '0',
                timestamp: latestActivity.timestamp
            } : null,
            audit: null,
            connectionState,
            pingStatus
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

module.exports = router;
