import express, { Response } from 'express';
import os from 'os';
import { QueryRequest } from '../../types/routes';

const router = express.Router();

router.get('/info', (_req: QueryRequest, res: Response) => {
    try {
        const info = {
            platform: os.platform(),
            release: os.release(),
            type: os.type(),
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            uptime: os.uptime(),
            hostname: os.hostname()
        };
        return res.json(info);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to get system info' });
    }
});

export default router;
