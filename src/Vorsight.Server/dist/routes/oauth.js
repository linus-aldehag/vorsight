"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleapis_1 = require("googleapis");
const database_1 = require("../db/database");
const router = express_1.default.Router();
// OAuth Configuration
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
];
router.get('/google', async (_req, res) => {
    try {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback');
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline', // Crucial for getting refresh token
            scope: SCOPES,
            prompt: 'consent' // Force consent to ensure refresh token is returned
        });
        return res.redirect(authUrl);
    }
    catch (error) {
        console.error('OAuth Init Error:', error);
        return res.status(500).send('Failed to initialize OAuth');
    }
});
router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code || typeof code !== 'string') {
            return res.status(400).send('Invalid code');
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback');
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.access_token || !tokens.expiry_date) {
            throw new Error('Invalid tokens received');
        }
        // Store tokens in database
        // We only support one Google Drive account for now, so we use upsert with a fixed ID or provider key
        // Using provider='google' as unique key if schema supports it, but schema has id Int @id.
        // We will findFirst to get ID, or create.
        const existing = await database_1.prisma.oAuthToken.findFirst({
            where: { provider: 'google' }
        });
        if (existing) {
            await database_1.prisma.oAuthToken.update({
                where: { id: existing.id },
                data: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token || existing.refreshToken, // Keep old refresh token if new one not provided
                    expiresAt: new Date(tokens.expiry_date),
                    updatedAt: new Date()
                }
            });
        }
        else {
            if (!tokens.refresh_token) {
                return res.status(400).send('No refresh token received. Please revoke access and try again.');
            }
            await database_1.prisma.oAuthToken.create({
                data: {
                    provider: 'google',
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresAt: new Date(tokens.expiry_date)
                }
            });
        }
        return res.redirect('/'); // Redirect to dashboard
    }
    catch (error) {
        console.error('OAuth Callback Error:', error);
        return res.status(500).send('Authentication failed');
    }
});
// Check status
router.get('/status', async (_req, res) => {
    try {
        const token = await database_1.prisma.oAuthToken.findFirst({
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
    }
    catch (error) {
        console.error('OAuth Status Error:', error);
        return res.json({ connected: false, error: 'Check failed' });
    }
});
exports.default = router;
//# sourceMappingURL=oauth.js.map