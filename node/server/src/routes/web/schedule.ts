import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { MachineSettings } from '../../types';

const router = express.Router();

// GET /api/web/v1/schedule?machineId=xxx
router.get('/', async (req: Request, res: Response) => {
    try {
        const { machineId } = req.query;

        if (!machineId || typeof machineId !== 'string') {
            return res.json(null);
        }

        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        if (state && state.settings) {
            const settings = JSON.parse(state.settings) as MachineSettings;
            // Check legacy vs new
            return res.json(settings.accessControl?.schedule || (settings as any).schedule || null);
        } else {
            return res.json(null);
        }
    } catch (error) {
        console.error('Get schedule error:', error);
        return res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

// POST /api/web/v1/schedule
router.post('/', async (req: Request, res: Response) => {
    try {
        const { machineId, ...schedule } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get existing settings
        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        // Use type assertion to avoid "not assignable" if logic is complex
        let settings = (state && state.settings ? JSON.parse(state.settings) : {}) as MachineSettings;

        // Ensure accessControl object exists
        if (!settings.accessControl) {
            settings.accessControl = { enabled: false, violationAction: 'logoff', schedule: [] };
        }

        // Update schedule
        settings.accessControl.schedule = schedule as any; // Cast if type mismatch with strict structure

        // Remove legacy property if present to cleanup
        delete (settings as any).schedule;

        // Save back to database
        await prisma.machineState.upsert({
            where: { machineId: machineId },
            create: {
                machineId: machineId,
                settings: JSON.stringify(settings),
                updatedAt: new Date()
            },
            update: {
                settings: JSON.stringify(settings),
                updatedAt: new Date()
            }
        });

        // Push schedule update to client via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('server:schedule_update', schedule);
        }

        return res.json(schedule);
    } catch (error) {
        console.error('Save schedule error:', error);
        return res.status(500).json({ error: 'Failed to save schedule' });
    }
});

export default router;
