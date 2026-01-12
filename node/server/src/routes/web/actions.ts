import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';

const router = express.Router();

// System actions (Shutdown, Logoff, Restart)
router.post('/system/:action', async (req: Request, res: Response) => {
    try {
        const { action } = req.params;
        const { machineId } = req.query;

        if (!machineId || typeof machineId !== 'string') {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const machineIdStr = machineId as string;
        const allowedActions = ['shutdown', 'logoff', 'restart', 'lock'];
        if (!allowedActions.includes(action as string)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const machine = await prisma.machine.findUnique({ where: { id: machineIdStr } });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('server:command', {
                type: action, // shutdown, logoff, etc.
                timestamp: new Date().toISOString()
            });

            // Log the action
            await prisma.auditEvent.create({
                data: {
                    machineId: machineIdStr,
                    eventId: crypto.randomUUID(),
                    eventType: 'SystemAction',
                    username: (req as any).user?.username || 'WebUser',
                    timestamp: new Date(),
                    details: JSON.stringify({ action }),
                    sourceLogName: 'WebControl'
                }
            });

            return res.json({ success: true, message: `Command ${action} sent` });
        } else {
            return res.status(500).json({ error: 'Socket service unavailable' });
        }

    } catch (error) {
        console.error('System action error:', error);
        return res.status(500).json({ error: 'Failed to perform system action' });
    }
});

export default router;
