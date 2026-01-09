"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const router = express_1.default.Router();
// Get activity summary for a machine (24-hour timeline + top apps)
router.get('/summary/:machineId', async (req, res) => {
    try {
        const { machineId } = req.params;
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // UNIX timestamps for query
        const oneDayAgoUnix = Math.floor(oneDayAgo.getTime() / 1000);
        // Get activity sessions from last 24 hours (merged, non-overlapping)
        const activities = await database_1.prisma.activitySession.findMany({
            where: {
                machineId: machineId,
                startTime: {
                    gte: oneDayAgoUnix
                }
            },
            orderBy: { startTime: 'desc' }
        });
        // Calculate timeline (activity by hour)
        const timeline = Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            activeMinutes: 0
        }));
        // Calculate top apps
        const appDurations = {};
        let totalDuration = 0;
        activities.forEach(activity => {
            const activityDate = new Date(activity.startTime * 1000); // Unix timestamp to milliseconds
            const hour = activityDate.getHours();
            const duration = activity.durationSeconds || 0;
            // Add to timeline
            if (timeline[hour]) {
                timeline[hour].activeMinutes += Math.floor(duration / 60);
            }
            // Add to app totals
            const appName = activity.processName || 'Unknown';
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
        return res.json({
            totalActiveHours,
            timeline,
            topApps,
            lastActive: activities.length > 0 ? new Date(activities[0].startTime * 1000).toISOString() : null
        });
    }
    catch (error) {
        console.error('Analytics summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});
exports.default = router;
//# sourceMappingURL=analytics.js.map