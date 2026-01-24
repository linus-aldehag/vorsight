import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { prisma } from '../../db/database';

const router = express.Router();

// OAuth Configuration
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
];

router.get('/google', async (_req: Request, res: Response) => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/web/v1/oauth/google/callback'
        );

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Crucial for getting refresh token
            scope: SCOPES,
            prompt: 'consent' // Force consent to ensure refresh token is returned
        });

        return res.redirect(authUrl);
    } catch (error) {
        console.error('OAuth Init Error:', error);
        return res.status(500).send('Failed to initialize OAuth');
    }
});

router.get('/google/callback', async (req: Request, res: Response) => {
    try {
        const { code } = req.query;

        if (!code || typeof code !== 'string') {
            return res.status(400).send('Invalid code');
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/web/v1/oauth/google/callback'
        );

        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.access_token || !tokens.expiry_date) {
            throw new Error('Invalid tokens received');
        }

        // Store tokens in database
        const existing = await prisma.oAuthToken.findFirst({
            where: { provider: 'google' }
        });

        if (existing) {
            await prisma.oAuthToken.update({
                where: { id: existing.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || existing.refreshToken, // Keep old refresh token
                    expiresAt: new Date(tokens.expiry_date),
                    updatedAt: new Date()
                }
            });
        } else {
            if (!tokens.refresh_token) {
                return res.status(400).send('No refresh token received. Please revoke access and try again.');
            }
            await prisma.oAuthToken.create({
                data: {
                    provider: 'google',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: new Date(tokens.expiry_date),
                    scope: SCOPES.join(' ')
                }
            });
        }

        return res.redirect('/'); // Redirect to dashboard
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        return res.status(500).send('Authentication failed');
    }
});

// Check status
router.get('/status', async (_req: Request, res: Response) => {
    try {
        const token = await prisma.oAuthToken.findFirst({
            where: { provider: 'google' }
        });

        if (!token) {
            return res.json({ connected: false });
        }

        const isExpired = new Date() > token.expiresAt;

        return res.json({
            connected: true,
            expired: isExpired,
            expiresAt: token.expiresAt
        });
    } catch (error) {
        console.error('OAuth Status Error:', error);
        return res.status(200).json({ connected: false, error: 'Check failed' });
    }
});

// Disconnect
router.post('/google/disconnect', async (_req: Request, res: Response) => {
    try {
        await prisma.oAuthToken.deleteMany({
            where: { provider: 'google' }
        });
        return res.json({ success: true, message: 'Disconnected successfully' });
    } catch (error) {
        console.error('Disconnect Error:', error);
        return res.status(500).send('Failed to disconnect');
    }
});

export default router;
