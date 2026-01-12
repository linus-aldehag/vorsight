import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { MachineSettings } from '../../types';

const router = express.Router();

// GET /api/web/v1/settings?machineId=xxx
router.get('/', async (req: Request, res: Response) => {
    try {
        const { machineId } = req.query;

        if (!machineId || typeof machineId !== 'string') {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get settings from machine_state
        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        // Default settings
        const defaults: Partial<MachineSettings> = {
            screenshotIntervalSeconds: 0,
            pingIntervalSeconds: 0,
            isMonitoringEnabled: false,
            isAuditEnabled: false
        };

        // Merge stored settings with defaults
        const storedSettings = (state && state.settings) ? JSON.parse(state.settings) : {};
        const mergedSettings = {
            ...defaults,
            ...storedSettings
        };

        return res.json(mergedSettings);
    } catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/web/v1/settings
router.post('/', async (req: Request, res: Response) => {
    try {
        const { machineId, ...newSettings } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get existing settings to preserve schedule
        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        let existingSettings = (state && state.settings ? JSON.parse(state.settings) : {}) as MachineSettings;

        // Merge new settings while preserving schedule
        const mergedSettings = {
            ...existingSettings,
            ...newSettings,
            // Preserve schedule if it exists
            schedule: existingSettings.schedule
        };

        // Save to machine_state
        await prisma.machineState.upsert({
            where: { machineId: machineId },
            create: {
                machineId: machineId,
                settings: JSON.stringify(mergedSettings),
                updatedAt: new Date()
            },
            update: {
                settings: JSON.stringify(mergedSettings),
                updatedAt: new Date()
            }
        });

        // Push settings update to client via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('server:settings_update', mergedSettings);
        }

        return res.json(mergedSettings);
    } catch (error: any) {
        console.error('Save settings error:', error);
        return res.status(500).json({ error: 'Failed to save settings', details: error.message });
    }
});

export default router;
