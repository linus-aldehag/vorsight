import express, { Request, Response } from 'express';
import { prisma } from '../db/database';

const router = express.Router();

// Get recent audit events (with optional filtering)
router.get('/', async (req: Request, res: Response) => {
    try {
        const { machineId, limit = '50', offset = '0', flaggedOnly } = req.query;

        const where: any = {};
        if (machineId) where.machineId = machineId;
        if (flaggedOnly === 'true') where.isFlagged = true;

        const events = await prisma.auditEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        // Parse details if JSON string
        const formatted = events.map((e: any) => ({
            ...e,
            details: typeof e.details === 'string' ? JSON.parse(e.details) : e.details
        }));

        return res.json(formatted);
    } catch (error) {
        console.error('Get audit events error:', error);
        return res.status(500).json({ error: 'Failed to fetch audit events' });
    }
});

// Acknowledge/Dismiss an event (e.g. unflag it)
router.patch('/:id/acknowledge', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { acknowledged } = req.body;

        await prisma.auditEvent.update({
            where: { id: parseInt(id as string) },
            data: {
                isFlagged: false,
                acknowledged: Boolean(acknowledged)
            }
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('Acknowledge audit event error:', error);
        return res.status(500).json({ error: 'Failed to acknowledge event' });
    }
});

// Add manual audit event (system generated)
router.post('/', async (req: Request, res: Response) => {
    try {
        const { machineId, eventType, details, isFlagged } = req.body;

        const event = await prisma.auditEvent.create({
            data: {
                machineId,
                eventId: crypto.randomUUID(), // System generated ID
                eventType,
                timestamp: new Date(),
                details: JSON.stringify(details || {}),
                isFlagged: !!isFlagged,
                username: 'SYSTEM',
                sourceLogName: 'Manual'
            }
        });

        return res.json(event);
    } catch (error) {
        console.error('Add audit event error:', error);
        return res.status(500).json({ error: 'Failed to add audit event' });
    }
});

export default router;
