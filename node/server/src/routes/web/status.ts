import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { getConnectionStatus, getStatusText } from '../../utils/statusHelper';
import { MachineSettings } from '../../types';

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
            settings: machine.state?.settings
        };

        const statusText = getStatusText({
            ...machineData,
            isOnline: status.isOnline
        });

        // Construct activity object from state
        let activity = null;
        if (machine.state) {
            activity = {
                activeWindowTitle: machine.state.activeWindow,
                timestamp: machine.state.lastActivityTime
            };
        }

        return res.json({
            status: status.connectionStatus,
            text: statusText,
            isOnline: status.isOnline,
            lastSeen: machine.lastSeen,
            activity
        });

    } catch (error) {
        console.error('Status error:', error);
        return res.status(500).json({ error: 'Status check failed' });
    }
});

export default router;
