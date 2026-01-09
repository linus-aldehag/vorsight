"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const router = express_1.default.Router();
// GET /api/settings?machineId=xxx
router.get('/', async (req, res) => {
    try {
        const { machineId } = req.query;
        if (!machineId || typeof machineId !== 'string') {
            // Return default settings if no machine specified
            return res.json({
                screenshotIntervalSeconds: 300,
                pingIntervalSeconds: 30,
                isMonitoringEnabled: true
            });
        }
        // Get settings from machine_state
        const state = await database_1.prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });
        // Default settings - all features disabled for new machines
        const defaults = {
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
    }
    catch (error) {
        console.error('Get settings error:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// POST /api/settings
router.post('/', async (req, res) => {
    try {
        const { machineId, ...newSettings } = req.body;
        if (!machineId) {
            return res.status(400).json({ error: 'machineId required' });
        }
        // Get existing settings to preserve schedule
        const state = await database_1.prisma.machineState.findUnique({
            where: { machineId: machineId },
            select: { settings: true }
        });
        let existingSettings = (state && state.settings ? JSON.parse(state.settings) : {});
        // Merge new settings while preserving schedule
        const mergedSettings = {
            ...existingSettings,
            ...newSettings,
            // Preserve schedule if it exists
            schedule: existingSettings.schedule
        };
        // Save to machine_state
        await database_1.prisma.machineState.upsert({
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
        return res.json(mergedSettings); // Return merged settings, not just new ones
    }
    catch (error) {
        console.error('Save settings error:', error);
        return res.status(500).json({ error: 'Failed to save settings', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map