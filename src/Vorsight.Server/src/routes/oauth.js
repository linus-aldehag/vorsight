const express = require('express');
const { google } = require('googleapis');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';

// Scopes needed for Drive uploads
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Create OAuth2 client
const createOAuth2Client = () => {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI
    );
};

/**
 * GET /api/oauth/google
 * Initiates the OAuth flow by redirecting to Google's consent screen
 */
router.get('/google', (req, res) => {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({
            error: 'OAuth not configured',
            message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in server .env'
        });
    }

    const oauth2Client = createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force consent to get refresh token
    });

    res.redirect(authUrl);
});

/**
 * GET /api/oauth/google/callback
 * Handles the OAuth callback from Google
 */
router.get('/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect('/?auth_error=no_code_provided');
    }

    try {
        const oauth2Client = createOAuth2Client();

        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            throw new Error('No refresh token received. User may have already authorized this app.');
        }

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

        // Delete existing Google OAuth token (only one per server)
        await prisma.oAuthToken.deleteMany({
            where: { provider: 'google' }
        });

        // Store new token in database
        await prisma.oAuthToken.create({
            data: {
                provider: 'google',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: expiresAt,
                scope: tokens.scope || SCOPES.join(' ')
            }
        });

        console.log('Google Drive connected successfully');

        // Redirect back to web UI with success
        res.redirect('/?auth_success=google_drive');
    } catch (err) {
        console.error('OAuth callback error:', err);
        res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
    }
});

/**
 * GET /api/oauth/google/status
 * Returns the current OAuth connection status
 */
router.get('/google/status', async (req, res) => {
    try {
        const token = await prisma.oAuthToken.findFirst({
            where: { provider: 'google' },
            select: {
                createdAt: true,
                updatedAt: true,
                expiresAt: true
            }
        });

        if (!token) {
            return res.json({
                connected: false
            });
        }

        const now = new Date();
        const isExpired = token.expiresAt < now;

        res.json({
            connected: true,
            connectedAt: token.createdAt,
            lastUpdated: token.updatedAt,
            expiresAt: token.expiresAt,
            isExpired
        });
    } catch (err) {
        console.error('Error fetching OAuth status:', err);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

/**
 * POST /api/oauth/google/disconnect
 * Removes stored OAuth credentials
 */
router.post('/google/disconnect', async (req, res) => {
    try {
        await prisma.oAuthToken.deleteMany({
            where: { provider: 'google' }
        });

        console.log('Google Drive disconnected');
        res.json({ success: true, message: 'Disconnected from Google Drive' });
    } catch (err) {
        console.error('Error disconnecting:', err);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

/**
 * GET /api/oauth/google/credentials
 * Returns temporary credentials for direct Drive uploads
 * PSK-authenticated endpoint for machine clients
 */
router.get('/google/credentials', async (req, res) => {
    try {
        // Verify PSK from machine client
        const psk = req.headers['x-preshared-key'];
        if (!psk || psk !== process.env.PSK) {
            return res.status(401).json({ error: 'Unauthorized: Invalid PSK' });
        }

        // Fetch OAuth token from database
        const tokenData = await prisma.oAuthToken.findFirst({
            where: { provider: 'google' }
        });

        if (!tokenData) {
            return res.status(404).json({
                error: 'Google Drive not connected',
                message: 'Administrator must connect Google Drive via web UI first'
            });
        }

        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials({
            access_token: tokenData.accessToken,
            refresh_token: tokenData.refreshToken,
            expiry_date: tokenData.expiresAt.getTime()
        });

        // Check if token is expired and refresh if needed
        const now = new Date();
        if (tokenData.expiresAt < now) {
            console.log('Access token expired, refreshing for client...');

            try {
                const { credentials } = await oauth2Client.refreshAccessToken();

                // Update database with new tokens
                await prisma.oAuthToken.update({
                    where: { id: tokenData.id },
                    data: {
                        accessToken: credentials.access_token,
                        expiresAt: new Date(credentials.expiry_date),
                        updatedAt: new Date()
                    }
                });

                // Return refreshed credentials
                return res.json({
                    accessToken: credentials.access_token,
                    expiresAt: new Date(credentials.expiry_date).toISOString(),
                    scope: tokenData.scope
                });
            } catch (err) {
                console.error('Failed to refresh token:', err);
                return res.status(500).json({
                    error: 'Token refresh failed',
                    message: 'Please re-authenticate via web UI'
                });
            }
        }

        // Return current valid credentials
        res.json({
            accessToken: tokenData.accessToken,
            expiresAt: tokenData.expiresAt.toISOString(),
            scope: tokenData.scope
        });
    } catch (err) {
        console.error('Error fetching credentials:', err);
        res.status(500).json({ error: 'Failed to fetch credentials' });
    }
});

module.exports = router;
