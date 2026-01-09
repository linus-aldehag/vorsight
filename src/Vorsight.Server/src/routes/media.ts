import express, { Request, Response } from 'express';
import { prisma } from '../db/database';

const router = express.Router();

// Redirect to Google Drive thumbnail
router.get('/thumbnail/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const screenshot = await prisma.screenshot.findUnique({
            where: { id: id },
            select: { googleDriveFileId: true }
        });

        if (!screenshot || !screenshot.googleDriveFileId) {
            // Return placeholder or 404
            return res.status(404).send('Not found');
        }

        // Redirect to Google Drive thumbnail (using a small trick with the ID)
        // Usually: https://drive.google.com/thumbnail?id=XXX
        return res.redirect(`https://drive.google.com/thumbnail?id=${screenshot.googleDriveFileId}`);
    } catch (error) {
        console.error('Thumbnail error:', error);
        return res.status(500).send('Error');
    }
});

// View full image (Redirect to Google Drive webContentLink or webViewLink)
router.get('/view/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const screenshot = await prisma.screenshot.findUnique({
            where: { id: id },
            select: { googleDriveFileId: true }
        });

        if (!screenshot || !screenshot.googleDriveFileId) {
            return res.status(404).send('Not found');
        }

        // Using direct link format
        // https://drive.google.com/uc?id=FILE_ID
        return res.redirect(`https://drive.google.com/uc?id=${screenshot.googleDriveFileId}`);
    } catch (error) {
        console.error('View error:', error);
        return res.status(500).send('Error');
    }
});

export default router;
