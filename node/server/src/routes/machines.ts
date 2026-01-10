import express, { Request, Response } from 'express';
import { authenticateMachine, authenticateBrowser } from '../middleware/auth';
import { machineService, RegisterDTO } from '../services/machineService';

const router = express.Router();

// Register a new machine (Public)
router.post('/register', async (req: Request, res: Response) => {
    try {
        const { machineId, name, hostname, metadata } = req.body as RegisterDTO;

        if (!machineId || !name) {
            return res.status(400).json({ error: 'machineId and name are required' });
        }

        const result = await machineService.register({ machineId, name, hostname, metadata });

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

// Get all machines (Browser Auth)
router.get('/', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const { status, includeArchived } = req.query;
        const machines = await machineService.getAll(
            typeof status === 'string' ? status : undefined,
            includeArchived === 'true'
        );
        return res.json(machines);
    } catch (error) {
        console.error('Get machines error:', error);
        return res.status(500).json({ error: 'Failed to fetch machines' });
    }
});

// Get single machine (Browser Auth)
router.get('/:id', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const machine = await machineService.getById(req.params.id as string);
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        return res.json(machine);
    } catch (error) {
        console.error('Get machine error:', error);
        return res.status(500).json({ error: 'Failed to fetch machine' });
    }
});

// Get machine state (Browser Auth)
router.get('/:id/state', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const state = await machineService.getState(req.params.id as string);
        return res.json(state || {});
    } catch (error) {
        console.error('Get state error:', error);
        return res.status(500).json({ error: 'Failed to fetch state' });
    }
});

// Update machine (Machine Auth)
router.put('/:id', authenticateMachine, async (req: Request, res: Response) => {
    try {
        await machineService.update(req.params.id as string, req.body);
        return res.json({ success: true });
    } catch (error) {
        console.error('Update machine error:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});

// Update machine display name (Browser Auth)
router.patch('/:id/display-name', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const { displayName } = req.body;
        const machineId = req.params.id as string;

        // Validate displayName
        if (displayName !== undefined && displayName !== null) {
            if (typeof displayName !== 'string') {
                return res.status(400).json({ error: 'Display name must be a string' });
            }
            if (displayName.trim().length === 0) {
                await machineService.updateDisplayName(machineId, null);
                return res.json({ success: true, displayName: null });
            }
        }

        await machineService.updateDisplayName(machineId, displayName || null);
        return res.json({ success: true, displayName: displayName || null });
    } catch (error) {
        console.error('Update display name error:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});

// Adopt a pending machine (Browser Auth)
router.post('/:id/adopt', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const {
            displayName,
            enableScreenshots,
            enableActivity,
            enableAudit,
            enableAccessControl,
            accessControlStartTime,
            accessControlEndTime
        } = req.body;
        const machineId = req.params.id as string;

        const result = await machineService.adopt({
            machineId,
            displayName,
            enableScreenshots,
            enableActivity,
            enableAudit,
            enableAccessControl,
            accessControlStartTime,
            accessControlEndTime
        });

        // Emit WebSocket event for machine adoption
        const io = req.app.get('io');
        if (io) {
            io.emit('machine:adopted', {
                machineId,
                name: result.machine.name,
                displayName,
                timestamp: new Date().toISOString()
            });
            // Also send updated machines list
            io.emit('web:subscribe');
        }

        console.log(`✓ Machine adopted: ${displayName || result.machine.name} (${machineId})`);

        return res.json({
            success: true,
            machineId,
            displayName,
            settings: result.settings
        });
    } catch (error) {
        console.error('Adopt machine error:', error);
        if (error instanceof Error) {
            if (error.message === 'Machine not found') return res.status(404).json({ error: error.message });
            if (error.message === 'Machine already adopted') return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Adoption failed' });
    }
});

// Archive a machine (Browser Auth)
router.patch('/:id/archive', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const machineId = req.params.id as string;
        const machine = await machineService.archive(machineId);

        // Emit WebSocket event to notify the Service if it's connected
        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('machine:archived', {
                machineId,
                timestamp: new Date().toISOString()
            });

            // Also broadcast updated machines list to all web clients
            io.emit('web:subscribe');
        }

        console.log(`✓ Machine archived: ${machine.displayName || machine.name} (${machineId})`);

        return res.json({
            success: true,
            machineId,
            status: 'archived'
        });
    } catch (error) {
        console.error('Archive machine error:', error);
        if (error instanceof Error) {
            if (error.message === 'Machine not found') return res.status(404).json({ error: error.message });
            if (error.message === 'Machine already archived') return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Archive failed' });
    }
});

// Un-archive a machine (Browser Auth)
router.patch('/:id/unarchive', authenticateBrowser, async (req: Request, res: Response) => {
    try {
        const machineId = req.params.id as string;
        const machine = await machineService.unarchive(machineId);

        // Emit WebSocket event to notify the Service if it's connected
        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('machine:unarchived', {
                machineId,
                timestamp: new Date().toISOString()
            });

            // Also broadcast updated machines list to all web clients
            io.emit('web:subscribe');
        }

        console.log(`✓ Machine un-archived: ${machine.displayName || machine.name} (${machineId})`);

        return res.json({
            success: true,
            machineId,
            status: 'active'
        });
    } catch (error) {
        console.error('Un-archive machine error:', error);
        if (error instanceof Error) {
            if (error.message === 'Machine not found') return res.status(404).json({ error: error.message });
            if (error.message === 'Machine is not archived') return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Un-archive failed' });
    }
});

export default router;
