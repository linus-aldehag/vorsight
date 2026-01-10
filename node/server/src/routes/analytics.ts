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

        // Initialize hourly intervals container
        const hourlyIntervals: Array<Array<{ start: number, end: number }>> = Array.from({ length: 24 }, () => []);

        activities.forEach(activity => {
            const start = activity.startTime * 1000;
            const end = activity.endTime * 1000;
            const duration = activity.durationSeconds || 0;

            // Add to app totals for "Top Processes" (simple sum is fine here as it reflects focus time)
            const appName = activity.processName || 'Unknown';
            appDurations[appName] = (appDurations[appName] || 0) + duration;
            totalDuration += duration;

            // Split into hour buckets for Timeline
            let current = start;
            while (current < end) {
                const currentHourStart = new Date(current);
                currentHourStart.setMinutes(0, 0, 0); // Corrected to remove milliseconds clearing if needed, but 3 args is fine

                const nextHourStart = new Date(currentHourStart);
                nextHourStart.setHours(nextHourStart.getHours() + 1);

                const hour = currentHourStart.getHours();
                const segmentEnd = Math.min(end, nextHourStart.getTime());

                // Store interval for this hour
                if (hourlyIntervals[hour]) {
                    hourlyIntervals[hour].push({ start: current, end: segmentEnd });
                }

                current = segmentEnd;
            }
        });

        // Calculate active minutes for each hour by merging overlapping intervals
        timeline.forEach((t, i) => {
            const intervals = hourlyIntervals[i];
            if (!intervals || intervals.length === 0) return;

            // Sort by start time
            intervals.sort((a, b) => a.start - b.start);

            let mergedDuration = 0;
            // Safe access because we checked length > 0
            let currentStart = intervals[0]?.start ?? 0;
            let currentEnd = intervals[0]?.end ?? 0;

            for (let k = 1; k < intervals.length; k++) {
                const next = intervals[k];
                if (!next) continue;

                if (next.start < currentEnd) {
                    // Overlap: extend current end if needed
                    currentEnd = Math.max(currentEnd, next.end);
                } else {
                    // Gap: add current duration and start new segment
                    mergedDuration += (currentEnd - currentStart);
                    currentStart = next.start;
                    currentEnd = next.end;
                }
            }
            // Add the last segment
            mergedDuration += (currentEnd - currentStart);

            t.activeMinutes = Math.round(mergedDuration / 1000 / 60);
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
