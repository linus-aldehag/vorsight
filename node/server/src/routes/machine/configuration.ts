import express, { Request, Response } from 'express';
import { authenticateMachine } from '../../middleware/auth';
import { prisma } from '../../db/database';
import { MachineSettings } from '../../types';

const router = express.Router();

// GET /api/agent/v1/configuration
// Fetch configuration for the authenticated machine
router.get('/', authenticateMachine, async (req: Request, res: Response) => {
    try {
        // req.machine is populated by authenticateMachine
        const machineId = req.machine!.id;

        // Get settings from machine_state
        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        // Default settings - all features disabled for new machines
        // Default settings - all features disabled for new machines
        const defaults: MachineSettings = {
            screenshots: { enabled: false, intervalSeconds: 300, filterDuplicates: true },
            network: { pingIntervalSeconds: 300 },
            activity: { enabled: false, intervalSeconds: 10 },
            audit: { enabled: false, filters: { security: true, system: true, application: true } },
            accessControl: { enabled: false, violationAction: 'logoff', schedule: [] }
        };

        // Merge stored settings with defaults
        const storedSettings = (state && state.settings) ? JSON.parse(state.settings) : {};

        // Deep merge logic (simplified) or just overlay?
        // If storedSettings is legacy, we might have issues here. 
        // But we ran migration, so storedSettings SHOULD be new structure.
        // We can just spread, but deep merge is safer for nested objects if partial.
        // For now, let's assume valid JSON from migration.
        const mergedSettings = {
            ...defaults,
            ...storedSettings,
            // Ensure nested objects are merged if they exist in stored
            screenshots: { ...defaults.screenshots, ...storedSettings.screenshots },
            monitoring: { ...defaults.network, ...storedSettings.monitoring }, // Legacy fallback
            network: { ...defaults.network, ...storedSettings.network },
            activity: { ...defaults.activity, ...storedSettings.activity },
            audit: { ...defaults.audit, ...storedSettings.audit },
            accessControl: { ...defaults.accessControl, ...storedSettings.accessControl }
        };

        return res.json(mergedSettings);
    } catch (error) {
        console.error('Get configuration error:', error);
        return res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// POST /api/agent/v1/configuration/applied
// Report that settings have been successfully applied
router.post('/applied', authenticateMachine, async (req: Request, res: Response) => {
    try {
        const machineId = req.machine!.id;
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({ error: 'settings required' });
        }

        // Update appliedSettings in machine_state
        await prisma.machineState.update({
            where: { machineId: machineId },
            data: {
                appliedSettings: typeof settings === 'string' ? settings : JSON.stringify(settings),
                updatedAt: new Date()
            }
        });

        return res.json({ success: true });
    } catch (error: any) {
        console.error('Report applied settings error:', error);
        return res.status(500).json({ error: 'Failed to report applied settings' });
    }
});

export default router;
