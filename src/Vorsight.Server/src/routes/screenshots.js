const express = require('express');
const router = express.Router();
const db = require('../db/database');

// POST /api/screenshots/request - Request a new screenshot
router.post('/request', (req, res) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            return res.status(400).json({ error: 'Machine ID required' });
        }

        // Get Socket.io instance
        const io = req.app.get('io');

        // Check if machine is online (optional, but good UX)
        // We can just emit to the room 'machine:{id}'

        // Emit event to specific machine
        io.to(`machine:${machineId}`).emit('server:command', {
            type: 'screenshot',
            timestamp: new Date().toISOString()
        });

        console.log(`Requested screenshot from machine ${machineId}`);
        res.json({ success: true, message: 'Screenshot requested' });

    } catch (error) {
        console.error('Request screenshot error:', error);
        res.status(500).json({ error: 'Failed to request screenshot' });
    }
});

// Get latest screenshot (legacy endpoint)
router.get('/latest', (req, res) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            return res.json(null);
        }

        const latest = db.prepare(`
      SELECT * FROM screenshots 
      WHERE machine_id = ? 
      ORDER BY capture_time DESC 
      LIMIT 1
    `).get(machineId);

        if (!latest) {
            return res.json(null);
        }

        // Transform to match DriveFile interface
        res.json({
            id: latest.id.toString(),
            name: latest.file_name || `screenshot_${latest.capture_time}.png`,
            createdTime: latest.capture_time,
            size: latest.file_size || 0,
            mimeType: 'image/png'
        });
    } catch (error) {
        console.error('Get latest screenshot error:', error);
        res.status(500).json({ error: 'Failed to fetch latest screenshot' });
    }
});

// Get screenshots for a machine with cursor-based pagination
router.get('/:machineId', (req, res) => {
    try {
        const { limit = 30, after } = req.query;
        const machineId = req.params.machineId;

        let query, params;
        if (after) {
            // Fetch screenshots BEFORE this ID (since we order DESC by capture_time)
            query = `
                SELECT * FROM screenshots 
                WHERE machine_id = ? AND id < ? 
                ORDER BY capture_time DESC 
                LIMIT ?
            `;
            params = [machineId, parseInt(after), parseInt(limit)];
        } else {
            query = `
                SELECT * FROM screenshots 
                WHERE machine_id = ? 
                ORDER BY capture_time DESC 
                LIMIT ?
            `;
            params = [machineId, parseInt(limit)];
        }

        const screenshots = db.prepare(query).all(...params);

        // Transform to match DriveFile interface
        const transformed = screenshots.map(s => ({
            id: s.id.toString(),
            name: s.file_name || `screenshot_${s.capture_time}.png`,
            createdTime: s.capture_time,
            size: s.file_size || 0,
            mimeType: 'image/png',
            webViewLink: '',
        }));

        // Check if there are more screenshots
        const hasMore = screenshots.length === parseInt(limit);

        res.json({
            screenshots: transformed,
            hasMore,
            cursor: transformed.length > 0 ? transformed[transformed.length - 1].id : null
        });
    } catch (error) {
        console.error('Get screenshots error:', error);
        res.status(500).json({ error: 'Failed to fetch screenshots' });
    }
});

module.exports = router;
