const express = require('express');
const router = express.Router();

// Legacy status endpoint for frontend compatibility
// TODO: Refactor frontend to use machine-specific state
router.get('/', (req, res) => {
    res.json({
        health: {
            screenshotsSuccessful: 0,
            screenshotsFailed: 0,
            uploadsSuccessful: 0,
            uploadsFailed: 0,
            totalScreenshotsSuccessful: 0,
            totalScreenshotsFailed: 0,
            totalUploadsSuccessful: 0,
            totalUploadsFailed: 0,
            periodDuration: '00:00:00',
            totalRuntime: '00:00:00'
        },
        uptime: {
            currentStart: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            isTracking: true
        },
        activity: null,
        audit: null
    });
});

module.exports = router;
