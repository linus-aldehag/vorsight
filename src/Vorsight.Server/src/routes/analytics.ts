import express, { Request, Response } from 'express';
import { prisma } from '../db/database';

const router = express.Router();

// Get activity summary for a machine (24-hour timeline + top apps)
router.get('/summary/:machineId', async (req: Request, res: Response) => {
    try {
        const { machineId } = req.params;
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // UNIX timestamps for query
        const oneDayAgoUnix = Math.floor(oneDayAgo.getTime() / 1000);

        // Get activity sessions from last 24 hours (merged, non-overlapping)
        const activities = await prisma.activitySession.findMany({
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
        const appDurations: Record<string, number> = {};
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
            lastActive: activities.length > 0 && activities[0] ? new Date(activities[0].startTime * 1000).toISOString() : null
        });
    } catch (error) {
        console.error('Analytics summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
});

export default router;
