import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { authenticateMachine } from '../../middleware/auth';

const router = express.Router();

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    exception?: string;
    sourceContext?: string;
}

// POST /api/agent/v1/logs
// Accepts a batch of logs from a machine
router.post('/', authenticateMachine, async (req: Request, res: Response) => {
    try {
        // req.machine is populated by authenticateMachine
        const machine = req.machine!;
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

export default router;
