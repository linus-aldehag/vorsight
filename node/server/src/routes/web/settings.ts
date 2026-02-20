import express, { Response } from 'express';
import { prisma } from '../../db/database';
import { QueryRequest, PaginationQuery } from '../../types/routes';


const router = express.Router();

// GET /api/web/v1/settings?machineId=xxx
router.get('/', async (req: QueryRequest<PaginationQuery>, res: Response) => {
    try {
        const { machineId } = req.query;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get settings from machine_state
        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        // Default settings
        const defaults = {

            screenshots: { enabled: false, intervalSeconds: 300, filterDuplicates: true },
            activity: { enabled: false, intervalSeconds: 10 },
            audit: { enabled: false, filters: { security: true, system: false, application: false } },
            accessControl: { enabled: false, violationAction: 'logoff', schedule: [] }
        };

        // Merge stored settings with defaults
        const storedSettings = (state && state.settings) ? JSON.parse(state.settings) : {};

        // Deep merge is safer here but spreading top level keys is a start
        // Any missing keys in stored will use defaults
        const mergedSettings = { ...defaults };

        if (storedSettings.screenshots) mergedSettings.screenshots = { ...defaults.screenshots, ...storedSettings.screenshots };
        if (storedSettings.activity) mergedSettings.activity = { ...defaults.activity, ...storedSettings.activity };
        if (storedSettings.audit) mergedSettings.audit = {
            ...defaults.audit,
            ...storedSettings.audit,
            filters: { ...defaults.audit.filters, ...(storedSettings.audit?.filters || {}) }
        };
        if (storedSettings.accessControl) mergedSettings.accessControl = {
            ...defaults.accessControl,
            ...storedSettings.accessControl,
            // schedule is an array, direct replace
        };

        return res.json(mergedSettings);
    } catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// POST /api/web/v1/settings
router.post('/', async (req: QueryRequest, res: Response) => {
    try {
        const { machineId, ...newSettings } = req.body;

        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }

        // Get existing settings
        const state = await prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });

        // Current stored settings
        let existingSettings = (state && state.settings ? JSON.parse(state.settings) : {});

        // Merge new settings on top of existing
        // Since the structure is hierarchical, we should probably do a smarter merge or just trust the client sent the full blob?
        // Usually Save sends the FULL settings object currently.
        // Let's assume full object replacement if top-level keys exist.

        const mergedSettings = {
            ...existingSettings,
            ...newSettings
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
