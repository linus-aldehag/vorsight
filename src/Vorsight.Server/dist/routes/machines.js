"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const crypto_1 = __importDefault(require("crypto"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Register a new machine (Public)
router.post('/register', async (req, res) => {
    try {
        const { machineId, name, hostname, metadata } = req.body;
        if (!machineId || !name) {
            return res.status(400).json({ error: 'machineId and name are required' });
        }
        // Check if machine already exists
        const existing = await database_1.prisma.machine.findUnique({
            where: { id: machineId }
        });
        if (existing) {
            return res.json({
                success: true,
                apiKey: existing.apiKey,
                machineId: existing.id,
                message: 'Machine already registered'
            });
        }
        // Generate API key
        const apiKey = crypto_1.default.randomBytes(32).toString('hex');
        // Insert machine
        await database_1.prisma.machine.create({
            data: {
                id: machineId,
                name,
                hostname: hostname || null,
                apiKey,
                status: 'pending',
                registrationDate: new Date(),
                metadata: JSON.stringify(metadata || {})
            }
        });
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
            apiKey,
            machineId
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
    }
});
// Get all machines (Browser Auth)
router.get('/', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { status, includeArchived } = req.query;
        const where = {};
        // Filter by status if provided
        if (typeof status === 'string') {
            where.status = status;
        }
        else if (includeArchived !== 'true') {
            // By default, exclude archived machines
            where.status = { not: 'archived' };
        }
        const machines = await database_1.prisma.machine.findMany({
            where,
            orderBy: { lastSeen: 'desc' },
            include: { state: true }
        });
        const formattedMachines = machines.map(row => {
            const lastSeen = row.lastSeen;
            // 90 seconds timeout (3x default ping interval of 30s)
            const isOnline = lastSeen && (Date.now() - lastSeen.getTime() < 90000);
            return {
                id: row.id,
                name: row.name,
                displayName: row.displayName,
                hostname: row.hostname,
                lastSeen: row.lastSeen,
                isOnline: !!isOnline,
                status: row.status || 'active',
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            };
        });
        return res.json(formattedMachines);
    }
    catch (error) {
        console.error('Get machines error:', error);
        return res.status(500).json({ error: 'Failed to fetch machines' });
    }
});
// Get single machine (Browser Auth)
router.get('/:id', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const machine = await database_1.prisma.machine.findUnique({
            where: { id: req.params.id }
        });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        return res.json(machine);
    }
    catch (error) {
        console.error('Get machine error:', error);
        return res.status(500).json({ error: 'Failed to fetch machine' });
    }
});
// Get machine state (Browser Auth)
router.get('/:id/state', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const state = await database_1.prisma.machineState.findUnique({
            where: { machineId: req.params.id }
        });
        return res.json(state || {});
    }
    catch (error) {
        console.error('Get state error:', error);
        return res.status(500).json({ error: 'Failed to fetch state' });
    }
});
// Update machine (Machine Auth)
router.put('/:id', auth_1.authenticateMachine, async (req, res) => {
    try {
        const { name, hostname, metadata } = req.body;
        const dataToUpdate = {};
        if (name)
            dataToUpdate.name = name;
        if (hostname)
            dataToUpdate.hostname = hostname;
        if (metadata)
            dataToUpdate.metadata = JSON.stringify(metadata);
        await database_1.prisma.machine.update({
            where: { id: req.params.id },
            data: dataToUpdate
        });
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Update machine error:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});
// Update machine display name (Browser Auth)
router.patch('/:id/display-name', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { displayName } = req.body;
        // Validate displayName if provided
        if (displayName !== undefined && displayName !== null) {
            if (typeof displayName !== 'string') {
                return res.status(400).json({ error: 'Display name must be a string' });
            }
            if (displayName.trim().length === 0) {
                // Empty string - reset to null
                await database_1.prisma.machine.update({
                    where: { id: req.params.id },
                    data: { displayName: null }
                });
                return res.json({ success: true, displayName: null });
            }
        }
        await database_1.prisma.machine.update({
            where: { id: req.params.id },
            data: { displayName: displayName || null }
        });
        return res.json({ success: true, displayName: displayName || null });
    }
    catch (error) {
        console.error('Update display name error:', error);
        return res.status(500).json({ error: 'Update failed' });
    }
});
// Adopt a pending machine (Browser Auth)
router.post('/:id/adopt', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const { displayName, enableScreenshots, enableActivity, enableAudit } = req.body;
        const machineId = req.params.id;
        // Verify machine exists and is pending
        const machine = await database_1.prisma.machine.findUnique({
            where: { id: machineId }
        });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        if (machine.status === 'active') {
            return res.status(400).json({ error: 'Machine already adopted' });
        }
        // Update machine status to active and set display name
        await database_1.prisma.machine.update({
            where: { id: machineId },
            data: {
                status: 'active',
                displayName: displayName || null
            }
        });
        // Create initial settings based on selected features
        const initialSettings = {
            screenshotIntervalSeconds: enableScreenshots ? 300 : 0,
            pingIntervalSeconds: enableActivity ? 30 : 0,
            isMonitoringEnabled: enableScreenshots || enableActivity,
            isAuditEnabled: !!enableAudit
        };
        // Store settings in machine_state
        await database_1.prisma.machineState.upsert({
            where: { machineId: machineId },
            create: {
                machineId: machineId,
                settings: JSON.stringify(initialSettings),
                updatedAt: new Date()
            },
            update: {
                settings: JSON.stringify(initialSettings),
                updatedAt: new Date()
            }
        });
        // Emit WebSocket event for machine adoption
        const io = req.app.get('io');
        if (io) {
            io.emit('machine:adopted', {
                machineId,
                name: machine.name,
                displayName,
                timestamp: new Date().toISOString()
            });
            // Also send updated machines list
            io.emit('web:subscribe');
        }
        console.log(`✓ Machine adopted: ${displayName || machine.name} (${machineId})`);
        return res.json({
            success: true,
            machineId,
            displayName,
            settings: initialSettings
        });
    }
    catch (error) {
        console.error('Adopt machine error:', error);
        return res.status(500).json({ error: 'Adoption failed' });
    }
});
// Archive a machine (Browser Auth)
router.patch('/:id/archive', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const machineId = req.params.id;
        // Verify machine exists
        const machine = await database_1.prisma.machine.findUnique({
            where: { id: machineId }
        });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        if (machine.status === 'archived') {
            return res.status(400).json({ error: 'Machine already archived' });
        }
        // Update machine status to archived
        await database_1.prisma.machine.update({
            where: { id: machineId },
            data: { status: 'archived' }
        });
        // Log connection event
        await database_1.prisma.connectionEvent.create({
            data: {
                machineId: machineId,
                eventType: 'Archived',
                metadata: JSON.stringify({ archivedAt: new Date().toISOString() })
            }
        });
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
    }
    catch (error) {
        console.error('Archive machine error:', error);
        return res.status(500).json({ error: 'Archive failed' });
    }
});
// Un-archive a machine (Browser Auth)
router.patch('/:id/unarchive', auth_1.authenticateBrowser, async (req, res) => {
    try {
        const machineId = req.params.id;
        // Verify machine exists
        const machine = await database_1.prisma.machine.findUnique({
            where: { id: machineId }
        });
        if (!machine) {
            return res.status(404).json({ error: 'Machine not found' });
        }
        if (machine.status !== 'archived') {
            return res.status(400).json({ error: 'Machine is not archived' });
        }
        // Update machine status back to active
        await database_1.prisma.machine.update({
            where: { id: machineId },
            data: { status: 'active' }
        });
        // Log connection event
        await database_1.prisma.connectionEvent.create({
            data: {
                machineId: machineId,
                eventType: 'Unarchived',
                metadata: JSON.stringify({ unarchivedAt: new Date().toISOString() })
            }
        });
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
    }
    catch (error) {
        console.error('Un-archive machine error:', error);
        return res.status(500).json({ error: 'Un-archive failed' });
    }
});
exports.default = router;
//# sourceMappingURL=machines.js.map