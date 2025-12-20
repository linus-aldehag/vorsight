const express = require('express');
const router = express.Router();
const db = require('../db/database');

// GET /api/analytics/summary - Get activity analytics summary
router.get('/summary', (req, res) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            // Return empty summary if no machine specified
            return res.json({
                totalActiveHours: 0,
                timeline: [],
                topApps: [],
                lastActive: new Date().toISOString()
            });
        }

        // Get activity for the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Build timeline (hourly activity)
        const timeline = [];
        for (let hour = 0; hour < 24; hour++) {
            timeline.push({ hour, activeMinutes: 0 });
        }

        // Get top applications
        const topAppsData = db.prepare(`
      SELECT 
        active_window as name,
        COUNT(*) as count
      FROM activity_history
      WHERE machine_id = ? AND timestamp > ?
      GROUP BY active_window
      ORDER BY count DESC
      LIMIT 5
    `).all(machineId, oneDayAgo);

        // Calculate total and percentages
        const total = topAppsData.reduce((sum, app) => sum + app.count, 0);
        const topApps = topAppsData.map(app => ({
            name: app.name || 'Unknown',
            percentage: total > 0 ? Math.round((app.count / total) * 100) : 0
        }));

        // Get last activity time
        const lastActivity = db.prepare(`
      SELECT timestamp FROM activity_history
      WHERE machine_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(machineId);

        res.json({
            totalActiveHours: 0, // TODO: Calculate from activity data
            timeline,
            topApps,
            lastActive: lastActivity?.timestamp || new Date().toISOString()
        });
    } catch (error) {
        console.error('Get analytics summary error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

module.exports = router;
