import express, { Request, Response } from 'express';
import { authenticateMachine } from '../../middleware/auth';
import { machineService, RegisterDTO } from '../../services/machineService';

const router = express.Router();

// Register a new machine (Public - but typically first contact)
// Ideally this should be protected by a shared secret or similar if possible, 
// but for this architecture it is the entry point.
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { machineId, name, hostname } = req.body as RegisterDTO;

        if (!machineId || !name) {
            return res.status(400).json({ error: 'machineId and name are required' });
        }

        const result = await machineService.register({ machineId, name, hostname });

        if (!result.isNew) {
            return res.json({
                success: true,
                apiKey: result.apiKey,
                machineId: result.machineId,
                message: 'Machine already registered'
            });
        }

        // Emit WebSocket event for new machine discovery
        const io = req.app.get('io');
        if (io) {
            io.emit('machine:discovered', {
                machineId,
                name,
                hostname,
                timestamp: new Date().toISOString()
            });
            console.log(`🔍 New machine discovered: ${name} (${machineId})`);
        }

        return res.json({
            success: true,
            apiKey: result.apiKey,
            machineId
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
    }
});

// Update machine details (Machine Auth)
router.put('/:id', authenticateMachine, async (req: Request, res: Response) => {
    try {
        await machineService.update(req.params.id as string, req.body);
        return res.json({ success: true });
    } catch (error) {
        console.error('Update machine error:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});

export default router;
