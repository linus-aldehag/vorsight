import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';

const router = express.Router();

// GET /api/web/v1/logs/:machineId
router.get('/:machineId', async (req: Request, res: Response) => {
    try {
        const { machineId } = req.params;
        const limit = parseInt(req.query.limit as string) || 100;

        const logs = await prisma.machineLog.findMany({
            where: { machineId },
            orderBy: { timestamp: 'desc' },
            take: limit
        });

        return res.json(logs);
    } catch (error) {
        console.error('Fetch logs error:', error);
        return res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;
