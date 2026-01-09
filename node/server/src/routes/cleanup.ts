import express, { Request, Response } from 'express';
import { prisma } from '../db/database';
import { authenticateBrowser } from '../middleware/auth';
import { performCleanup } from '../jobs/cleanup';

const router = express.Router();

// Get cleanup settings
router.get('/', authenticateBrowser, async (_req: Request, res: Response) => {
    try {
        const settings = await prisma.cleanupSettings.findUnique({ where: { id: 1 } });
        return res.json(settings || {
            activityRetentionDays: 90,
            screenshotRetentionDays: 30,
            auditRetentionDays: 180,
            heartbeatRetentionHours: 48,
            deleteDriveFiles: false
        });
    } catch (error) {
        console.error('Get cleanup settings error:', error);
        return res.status(500).json({ error: 'Failed to fetch cleanup settings' });
    }
});

interface CleanupSettingsBody {
    activityRetentionDays: number;
    screenshotRetentionDays: number;
    auditRetentionDays: number;
    heartbeatRetentionHours: number;
    deleteDriveFiles: boolean;
}

// Update cleanup settings
router.put('/', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const { activityRetentionDays, screenshotRetentionDays, auditRetentionDays, heartbeatRetentionHours, deleteDriveFiles } = req.body as CleanupSettingsBody;

        await prisma.cleanupSettings.upsert({
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
    } catch (error) {
        console.error('Update cleanup settings error:', error);
        return res.status(500).json({ error: 'Failed to update cleanup settings' });
    }
});

// Trigger manual cleanup
router.post('/run', authenticateBrowser, async (_req: Request, res: Response) => {
    try {
        const stats = await performCleanup();
        return res.json({ success: true, stats });
    } catch (error) {
        console.error('Manual cleanup error:', error);
        return res.status(500).json({ error: 'Cleanup failed' });
    }
});

export default router;
