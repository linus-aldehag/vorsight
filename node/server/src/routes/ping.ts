import express, { Request, Response } from 'express';
import ping from 'ping';
import { prisma } from '../db/database';
import { authenticateBrowser } from '../middleware/auth';

const router = express.Router();

// Ping a specific machine by ID
router.post('/:machineId', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const { machineId } = req.params;

        // Get machine IP address
        const machine = await prisma.machine.findUnique({
            where: { id: machineId },
            select: { id: true, name: true, ipAddress: true, hostname: true }
        });

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // Try IP first, fallback to hostname
        const target = machine.ipAddress || machine.hostname;

        if (!target) {
            return res.status(400).json({
                error: 'No IP address or hostname available for this machine',
                alive: false
            });
        }

        // Perform ping (timeout: 5 seconds)
        const result = await ping.promise.probe(target, {
            timeout: 5,
            extra: ['-n', '1'] // Windows: send 1 packet
        });

        return res.json({
            machineId: machine.id,
            machineName: machine.name,
            target,
            alive: result.alive,
            time: result.time,
            numeric_host: result.numeric_host
        });

    } catch (error) {
        console.error('Ping error:', error);
        return res.status(500).json({ error: 'Ping failed', alive: false });
    }
});

// Ping all machines
router.post('/', authenticateBrowser, async (_req: Request, res: Response) => {
    try {
        const machines = await prisma.machine.findMany({
            select: { id: true, name: true, ipAddress: true, hostname: true }
        });

        const results = await Promise.all(
            machines.map(async (machine) => {
                const target = machine.ipAddress || machine.hostname;

                if (!target) {
                    return {
                        machineId: machine.id,
                        machineName: machine.name,
                        alive: false,
                        error: 'No target address'
                    };
                }

                try {
                    const result = await ping.promise.probe(target, {
                        timeout: 5,
                        extra: ['-n', '1']
                    });

                    return {
                        machineId: machine.id,
                        machineName: machine.name,
                        target,
                        alive: result.alive,
                        time: result.time
                    };
                } catch (error: any) {
                    return {
                        machineId: machine.id,
                        machineName: machine.name,
                        target,
                        alive: false,
                        error: error.message
                    };
                }
            })
        );

        return res.json({ results });

    } catch (error) {
        console.error('Ping all error:', error);
        return res.status(500).json({ error: 'Ping all failed' });
    }
});

export default router;
