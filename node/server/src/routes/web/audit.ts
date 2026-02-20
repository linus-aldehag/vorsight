import express, { Response } from 'express';
import { prisma } from '../../db/database';
import crypto from 'crypto';
import { IdRequest, PaginationQuery, QueryRequest } from '../../types/routes';

const router = express.Router();

// Get recent audit events (with optional filtering)
router.get('/', async (req: QueryRequest<PaginationQuery>, res: Response) => {
    try {
        const { machineId, limit = '50', offset = '0', flaggedOnly, unacknowledgedOnly } = req.query;

        const where: any = {};
        if (machineId) where.machineId = machineId;
        if (flaggedOnly === 'true') where.isFlagged = true;
        if (unacknowledgedOnly === 'true') where.acknowledged = false;

        const events = await prisma.auditEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string)
        });

        // Parse details if JSON string
        const formatted = events.map((e: any) => ({
            ...e,
            details: (() => {
                if (typeof e.details !== 'string') return e.details;
                try {
                    return JSON.parse(e.details);
                } catch {
                    return e.details; // Return raw string if parse fails
                }
            })()
        }));

        return res.json(formatted);
    } catch (error) {
        console.error('Get audit events error:', error);
        return res.status(500).json({ error: 'Failed to fetch audit events' });
    }
});

// Acknowledge/Dismiss an event (e.g. unflag it)
router.patch('/:id/acknowledge', async (req: IdRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { acknowledged } = req.body;

        await prisma.auditEvent.update({
            where: { id: parseInt(id) },
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
router.post('/', async (req: QueryRequest, res: Response) => {
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
