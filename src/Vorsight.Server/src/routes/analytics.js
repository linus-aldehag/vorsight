const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Get activity summary for a machine (24-hour timeline + top apps)
router.get('/summary/:machineId', (req, res) => {
    try {
        const { machineId } = req.params;
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get activity data from last 24 hours
        const activities = db.prepare(`
            SELECT * FROM activity_history 
            WHERE machine_id = ? AND timestamp >= ?
            ORDER BY timestamp DESC
        `).all(machineId, oneDayAgo.toISOString());

        // Calculate timeline (activity by hour)
        const timeline = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            activeMinutes: 0
        }));

        // Calculate top apps
        const appDurations = {};
        let totalDuration = 0;

        activities.forEach(activity => {
            const activityDate = new Date(activity.timestamp);
            const hour = activityDate.getHours();
            const duration = activity.duration || 0;

            // Add to timeline
            timeline[hour].activeMinutes += Math.floor(duration / 60);

            // Add to app totals
            const appName = activity.process_name || 'Unknown';
            appDurations[appName] = (appDurations[appName] || 0) + duration;
            totalDuration += duration;
        });

        // Sort apps by duration and take top 5
        const topApps = Object.entries(appDurations)
            .map(([name, duration]) => ({
                name,
                percentage: totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0
            }))
            .sort((a, b) => b.percentage - a.percentage)
            .slice(0, 5);

        // Calculate total active hours
        const totalActiveHours = Math.round(totalDuration / 3600 * 10) / 10;

        res.json({
            totalActiveHours,
            timeline,
            topApps,
            lastActive: activities.length > 0 ? activities[0].timestamp : null
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

module.exports = router;
