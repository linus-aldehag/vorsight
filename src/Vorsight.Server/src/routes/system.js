const express = require('express');
const router = express.Router();

router.post('/:action', (req, res) => {
    try {
        const { action } = req.params;
        const { machineId } = req.query;

        // Validation
        if (!['shutdown', 'logout'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        if (!machineId) {
            return res.status(400).json({ error: 'Machine ID required' });
        }

        const io = req.app.get('io');

        // Emit command to specific machine
        io.to(`machine:${machineId}`).emit('server:command', {
            type: action,
            timestamp: new Date().toISOString()
        });

        console.log(`Sent system command '${action}' to machine ${machineId}`);
        res.json({ success: true, message: `Command ${action} sent` });

    } catch (error) {
        console.error('System action error:', error);
        res.status(500).json({ error: 'Failed to process system action' });
    }
});

module.exports = router;
