import express, { Request, Response } from 'express';
import { prisma } from '../db/database';
import { authenticateBrowser } from '../middleware/auth'; // Using browser auth for now, but machine auth should be used ideally. 
// However, the Service uses x-api-key header which we need to validate.
// We'll implement a custom middleware or check headers manually if a shared middleware isn't available for machine/api-key auth.

const router = express.Router();

// Middleware to authenticate machine via API Key
const authenticateMachine = async (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
        return res.status(401).json({ error: 'Missing API key' });
    }

    try {
        const machine = await prisma.machine.findUnique({
            where: { apiKey }
        });

        if (!machine) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Attach machine to request for downstream use
        (req as any).machine = machine;
        return next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    exception?: string;
    sourceContext?: string;
}

// POST /api/logs
// Accepts a batch of logs from a machine
router.post('/', authenticateMachine, async (req: Request, res: Response) => {
    try {
        const machine = (req as any).machine;
        const logs: LogEntry[] = req.body;

        if (!Array.isArray(logs)) {
            return res.status(400).json({ error: 'Body must be an array of logs' });
        }

        if (logs.length === 0) {
            return res.status(200).json({ count: 0 });
        }

        // Create log entries in transaction
        await prisma.machineLog.createMany({
            data: logs.map(log => ({
                machineId: machine.id,
                timestamp: new Date(log.timestamp),
                level: log.level,
                message: log.message,
                exception: log.exception,
                sourceContext: log.sourceContext
            }))
        });

        return res.json({ count: logs.length });

    } catch (error) {
        console.error('Log ingestion error:', error);
        return res.status(500).json({ error: 'Failed to ingest logs' });
    }
});

// GET /api/logs/:machineId
router.get('/:machineId', authenticateBrowser, async (req: Request, res: Response) => {
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
