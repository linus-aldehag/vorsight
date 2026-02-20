import express, { Response } from 'express';
import { prisma } from '../../db/database';
import { ActionParams, ActionRequest, PaginationQuery } from '../../types/routes';

const router = express.Router();

// System actions (Shutdown, Logoff, Restart)
router.post('/system/:action', async (req: ActionRequest<PaginationQuery>, res: Response) => {
    try {
        const { action } = req.params;
        const { machineId } = req.query;

        if (!machineId || typeof machineId !== 'string') {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const allowedActions = ['shutdown', 'logoff', 'restart', 'lock'];
        if (!allowedActions.includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        const machine = await prisma.machine.findUnique({ where: { id: machineId } });
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
                    machineId: machineId,
                    eventId: crypto.randomUUID(),
                    eventType: 'SystemAction',
                    username: req.user?.username || 'WebUser',
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
