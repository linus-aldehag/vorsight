import express, { Request, Response } from 'express';
import { authenticateMachine } from '../../middleware/auth';
import { prisma } from '../../db/database';
import { MachineSettings } from '../../types';

const router = express.Router();

// GET /api/agent/v1/schedule
router.get('/', authenticateMachine, async (req: Request, res: Response) => {
    try {
        const machineId = req.machine!.id;

        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        if (state && state.settings) {
            const settings = JSON.parse(state.settings) as MachineSettings;
            return res.json(settings.schedule || null);
        } else {
            return res.json(null);
        }
    } catch (error) {
        console.error('Get schedule error:', error);
        return res.status(500).json({ error: 'Failed to fetch schedule' });
    }
});

export default router;
