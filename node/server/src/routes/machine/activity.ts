import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { authenticateMachine } from '../../middleware/auth';

const router = express.Router();


import { ActivityPayload } from '../../types';

// Add activity heartbeat (authenticated) - processes into sessions
router.post('/', authenticateMachine, async (req: Request, res: Response) => {
    try {
        const payload = req.body as ActivityPayload;
        // Optional pingInterval currently sent by agent but not in strict schema yet? 
        // We can cast to any for legacy or update schema. 
        // Let's assume schema needs update if we want strictness.
        const { timestamp, activeWindow, processName, username } = payload;
        const pingIntervalSeconds = (req.body as any).pingIntervalSeconds || 30;

        if (!req.machine) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const machineId = req.machine.id;
        const currentTime = Math.floor(Date.now() / 1000);

        let heartbeatTime: Date;
        let timeSeconds: number;

        if (typeof timestamp === 'string') {
            heartbeatTime = new Date(timestamp);
            timeSeconds = Math.floor(heartbeatTime.getTime() / 1000);
        } else {
            timeSeconds = (timestamp as number) || currentTime;
            heartbeatTime = new Date(timeSeconds * 1000);
        }

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

        // timeSeconds is computed above

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
