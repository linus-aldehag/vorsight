import express, { Request, Response } from 'express';
import { prisma } from '../db/database';
import { authenticateMachine } from '../middleware/auth';

const router = express.Router();

// Get activity summary (legacy endpoint - returns empty for now)
router.get('/summary', (_req: Request, res: Response) => {
    return res.json([]);
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

interface ActivityBody {
    timestamp: number | null;
    activeWindow: string;
    processName: string;
    username: string;
    pingIntervalSeconds?: number;
}

// Add activity heartbeat (authenticated) - processes into sessions
router.post('/', authenticateMachine, async (req: Request, res: Response) => {
    try {
        const { timestamp, activeWindow, processName, username, pingIntervalSeconds = 30 } = req.body as ActivityBody;

        if (!req.machine) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const machineId = req.machine.id;
        const currentTime = Math.floor(Date.now() / 1000);
        const heartbeatTime = new Date((timestamp || currentTime) * 1000);

        // Store raw heartbeat for debugging (optional, short retention via jobs/heartbeatCleanup)
        await prisma.activityHistory.create({
            data: {
                machineId: machineId,
                timestamp: heartbeatTime,
                activeWindow: activeWindow,
                processName: processName,
                username: username
            }
        });

        // Get most recent session for this machine
        const recentSession = await prisma.activitySession.findFirst({
            where: { machineId: machineId },
            orderBy: { endTime: 'desc' }
        });

        const timeSeconds = timestamp || currentTime;

        // Determine if we should extend existing session or create new one
        const shouldExtend = recentSession &&
            recentSession.processName === processName &&
            recentSession.activeWindow === activeWindow &&
            (timeSeconds - recentSession.endTime) <= (pingIntervalSeconds * 2); // Allow 2x ping interval grace

        // Update sessions (aggregation)
        if (shouldExtend) {
            // Extend existing session
            const newEndTime = timeSeconds;
            const newDuration = newEndTime - recentSession.startTime;
            const newHeartbeatCount = recentSession.heartbeatCount + 1;

            await prisma.activitySession.update({
                where: { id: recentSession.id },
                data: {
                    endTime: newEndTime,
                    durationSeconds: newDuration,
                    heartbeatCount: newHeartbeatCount,
                    updatedAt: new Date()
                }
            });

            console.log(`Extended session ${recentSession.id} to ${newDuration}s (${newHeartbeatCount} heartbeats)`);
        } else {
            // Create new session
            const newSession = await prisma.activitySession.create({
                data: {
                    machineId: machineId,
                    startTime: timeSeconds,
                    endTime: timeSeconds,
                    durationSeconds: 0,
                    processName: processName,
                    activeWindow: activeWindow,
                    username: username,
                    heartbeatCount: 1
                }
            });

            console.log(`Created new session ${newSession.id} for ${processName}`);
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Add activity error:', error);
        return res.status(500).json({ error: 'Failed to add activity' });
    }
});

export default router;
