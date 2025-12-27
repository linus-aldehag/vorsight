const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateBrowser } = require('../middleware/auth');

// Get cleanup settings
router.get('/', authenticateBrowser, (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM cleanup_settings WHERE id = 1').get();
        res.json(settings || {
            activity_retention_days: 90,
            screenshot_retention_days: 30,
            audit_retention_days: 180,
            delete_drive_files: 0
        });
    } catch (error) {
        console.error('Get cleanup settings error:', error);
        res.status(500).json({ error: 'Failed to fetch cleanup settings' });
    }
});

// Update cleanup settings
router.put('/', authenticateBrowser, (req, res) => {
    try {
        const { activityRetentionDays, screenshotRetentionDays, auditRetentionDays, deleteDriveFiles } = req.body;

        db.prepare(`
            UPDATE cleanup_settings 
            SET activity_retention_days = ?,
                screenshot_retention_days = ?,
                audit_retention_days = ?,
                delete_drive_files = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        `).run(activityRetentionDays, screenshotRetentionDays, auditRetentionDays, deleteDriveFiles ? 1 : 0);

        res.json({ success: true });
    } catch (error) {
        console.error('Update cleanup settings error:', error);
        res.status(500).json({ error: 'Failed to update cleanup settings' });
    }
});

// Trigger manual cleanup
router.post('/run', authenticateBrowser, async (req, res) => {
    try {
        const { performCleanup } = require('../jobs/cleanup');
        const stats = await performCleanup();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

module.exports = router;
