import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
// Auth handled by server mount

const router = express.Router();

// Get activity summary (legacy endpoint - returns empty for now)
router.get('/summary', (_req: Request, res: Response) => {
    return res.json([]);
});

// Get activity sessions for chart (24h view)
router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const { machineId, hoursAgo } = req.query;
        if (!machineId) {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const hours = parseInt(hoursAgo as string) || 24;
        const cutoffTime = Math.floor(Date.now() / 1000) - (hours * 3600);

        const sessions = await prisma.activitySession.findMany({
            where: {
                machineId: machineId as string,
                startTime: {
                    gte: cutoffTime
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        return res.json(sessions);
    } catch (error) {
        console.error('Get activity sessions error:', error);
        return res.status(500).json({ error: 'Failed to fetch activity sessions' });
    }
});

// Get activity sessions for a machine
router.get('/:machineId', async (req: Request, res: Response) => {
    try {
        const { limit = '100', offset = '0' } = req.query;
        const machineId = req.params.machineId;

        const sessions = await prisma.activitySession.findMany({
            where: { machineId: machineId },
            orderBy: { startTime: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        // Convert to frontend format (timestamp = start_time for compatibility)
        const formatted = sessions.map(s => ({
            id: s.id,
            machine_id: s.machineId,
            timestamp: s.startTime,
            active_window: s.activeWindow,
            process_name: s.processName,
            duration: s.durationSeconds,
            username: s.username
        }));

        return res.json(formatted);
    } catch (error) {
        console.error('Get activity error:', error);
        return res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

export default router;
