"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const cleanup_1 = require("../jobs/cleanup");
const router = express_1.default.Router();
// Get cleanup settings
router.get('/', auth_1.authenticateBrowser, async (_req, res) => {
    try {
        const settings = await database_1.prisma.cleanupSettings.findUnique({ where: { id: 1 } });
        return res.json(settings || {
            activityRetentionDays: 90,
            screenshotRetentionDays: 30,
            auditRetentionDays: 180,
            heartbeatRetentionHours: 48,
            deleteDriveFiles: false
        });
    }
    catch (error) {
        console.error('Get cleanup settings error:', error);
        return res.status(500).json({ error: 'Failed to fetch cleanup settings' });
    }
});
// Update cleanup settings
router.put('/', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { activityRetentionDays, screenshotRetentionDays, auditRetentionDays, heartbeatRetentionHours, deleteDriveFiles } = req.body;
        await database_1.prisma.cleanupSettings.upsert({
            where: { id: 1 },
            create: {
                id: 1,
                activityRetentionDays,
                screenshotRetentionDays,
                auditRetentionDays,
                heartbeatRetentionHours,
                deleteDriveFiles,
                updatedAt: new Date()
            },
            update: {
                activityRetentionDays,
                screenshotRetentionDays,
                auditRetentionDays,
                heartbeatRetentionHours,
                deleteDriveFiles,
                updatedAt: new Date()
            }
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Update cleanup settings error:', error);
        return res.status(500).json({ error: 'Failed to update cleanup settings' });
    }
});
// Trigger manual cleanup
router.post('/run', auth_1.authenticateBrowser, async (_req, res) => {
    try {
        const stats = await (0, cleanup_1.performCleanup)();
        return res.json({ success: true, stats });
    }
    catch (error) {
        console.error('Manual cleanup error:', error);
        return res.status(500).json({ error: 'Cleanup failed' });
    }
});
exports.default = router;
//# sourceMappingURL=cleanup.js.map