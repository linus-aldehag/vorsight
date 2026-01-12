import express, { Request, Response } from 'express';
import { prisma } from '../../db/database';
import { Prisma } from '@prisma/client';

const router = express.Router();

// Get screenshots with pagination and filtering
router.get('/', async (req: Request, res: Response) => {
    try {
        const { machineId, limit = '20', cursor } = req.query;

        const where: Prisma.ScreenshotWhereInput = {};
        if (machineId) where.machineId = machineId as string;

        const take = parseInt(limit as string);

        const queryOptions: Prisma.ScreenshotFindManyArgs = {
            where,
            orderBy: [
                { captureTime: 'desc' },
                { id: 'asc' } // Secondary sort for stable cursor pagination
            ],
            take: take + 1 // Take one extra to determine next cursor
        };

        if (cursor) {
            queryOptions.cursor = { id: cursor as string };
            queryOptions.skip = 1; // Skip the cursor itself
        }

        const screenshots = await prisma.screenshot.findMany(queryOptions);

        let nextCursor: string | undefined = undefined;
        if (screenshots.length > take) {
            const nextItem = screenshots.pop(); // Remove the extra item
            nextCursor = nextItem?.id;
        }

        return res.json({
            screenshots: screenshots,
            cursor: nextCursor,
            hasMore: !!nextCursor
        });
    } catch (error) {
        console.error('Get screenshots error:', error);
        return res.status(500).json({ error: 'Failed to fetch screenshots' });
    }
});

// Get single screenshot details
// Note: Actual image is served via /api/web/v1/media/view/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const screenshot = await prisma.screenshot.findUnique({
            where: { id: id }
        });

        if (!screenshot) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }

        return res.json(screenshot);
    } catch (error) {
        console.error('Get screenshot error:', error);
        return res.status(500).json({ error: 'Failed to fetch screenshot' });
    }
});

// Request a new screenshot (TRIGGER)
router.post('/request', async (req: Request, res: Response) => {
    try {
        const { machineId } = req.query;
        if (!machineId || typeof machineId !== 'string') {
            return res.status(400).json({ error: 'machineId is required' });
        }

        const io = req.app.get('io');
        if (io) {
            io.to(`machine:${machineId}`).emit('server:command', {
                type: 'screenshot_request',
                timestamp: new Date().toISOString()
            });
            return res.json({ success: true, message: 'Screenshot requested' });
        } else {
            return res.status(500).json({ error: 'Socket service unavailable' });
        }
    } catch (error) {
        console.error('Request screenshot error:', error);
        return res.status(500).json({ error: 'Failed to request screenshot' });
    }
});

export default router;
