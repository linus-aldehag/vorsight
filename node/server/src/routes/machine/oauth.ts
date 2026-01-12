import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { prisma } from '../../db/database';
import { authenticateMachine } from '../../middleware/auth';

const router = express.Router();

// Retrieve Google Access Token for the machine
router.get('/google/credentials', authenticateMachine, async (_req: Request, res: Response) => {
    try {
        const token = await prisma.oAuthToken.findFirst({
            where: { provider: 'google' }
        });

        if (!token) {
            return res.status(404).json({ error: 'No Google credentials found. Please authenticate via the Web UI.' });
        }

        // Check if token is expired or close to expiring (within 5 mins)
        const expiryDate = new Date(token.expiresAt);
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000;

        if (now.getTime() + fiveMinutes > expiryDate.getTime()) {
            console.log('🔄 Access token expired or close to expiry, refreshing...');

            if (!token.refreshToken) {
                return res.status(400).json({ error: 'No refresh token available. Please re-authenticate via Web UI.' });
            }

            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET
            );

            oauth2Client.setCredentials({
                refresh_token: token.refreshToken
            });

            const { credentials } = await oauth2Client.refreshAccessToken();

            if (!credentials.access_token || !credentials.expiry_date) {
                throw new Error('Failed to obtain new access token');
            }

            // Update database
            const updatedToken = await prisma.oAuthToken.update({
                where: { id: token.id },
                data: {
                    accessToken: credentials.access_token,
                    expiresAt: new Date(credentials.expiry_date),
                    updatedAt: new Date()
                }
            });

            return res.json({
                accessToken: updatedToken.accessToken,
                expiresAt: updatedToken.expiresAt.toISOString(),
                scope: updatedToken.scope
            });
        }

        // Return existing valid token
        return res.json({
            accessToken: token.accessToken,
            expiresAt: token.expiresAt.toISOString(), // Ensure ISO string format for C# parser
            scope: token.scope
        });

    } catch (error) {
        console.error('Error fetching Google credentials for machine:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
