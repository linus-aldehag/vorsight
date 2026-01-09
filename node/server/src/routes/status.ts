import express, { Request, Response } from 'express';
import { prisma } from '../db/database';
import { getConnectionStatus, getStatusText } from '../utils/statusHelper';
import { MachineSettings } from '../types';

const router = express.Router();

// Get simple status text for a machine
router.get('/:machineId', async (req: Request, res: Response) => {
    try {
        const { machineId } = req.params;

        const machine = await prisma.machine.findUnique({
            where: { id: machineId },
            include: { state: true }
        });

        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }

        // Calculate status
        let pingIntervalSeconds = 30;
        try {
            if (machine.state?.settings) {
                const settings = JSON.parse(machine.state.settings) as MachineSettings;
                pingIntervalSeconds = settings.pingIntervalSeconds || 30;
            }
        } catch (e) { }

        const status = getConnectionStatus(machine.lastSeen, pingIntervalSeconds);

        // Prepare object for status text helper
        const machineData = {
            name: machine.name,
            displayName: machine.displayName,
            lastSeen: machine.lastSeen,
            settings: machine.state?.settings // string or object? Helper handles both?
            // Actually statusHelper expects it to be whatever it handles.
            // Let's pass the raw string if that's what we have, or parsed?
            // Checking statusHelper.ts usage in socketHandler: it passed parsed settings OR raw?
            // In socketHandler I passed `settings: m.settings` (string).
            // Let's pass query result.
        };

        // We need to inject connectionStatus into machineData for getStatusText?
        // getStatusText uses `machine.isOnline` and `machine.settings` (for monitoring check).

        const statusText = getStatusText({
            ...machineData,
            isOnline: status.isOnline
        });

        return res.json({
            status: status.connectionStatus,
            text: statusText,
            isOnline: status.isOnline,
            lastSeen: machine.lastSeen
        });

    } catch (error) {
        console.error('Status error:', error);
        return res.status(500).json({ error: 'Status check failed' });
    }
});

export default router;
