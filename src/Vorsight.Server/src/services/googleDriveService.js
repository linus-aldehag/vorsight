const { google } = require('googleapis');
const { prisma } = require('../db/database');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID;
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';
    }

    /**
     * Get authenticated Google Drive client
     * Automatically refreshes expired tokens
     */
    async getDriveClient() {
        // Fetch OAuth token from database
        const tokenData = await prisma.oAuthToken.findFirst({
            where: { provider: 'google' }
        });

        if (!tokenData) {
            throw new Error('Google Drive not connected. Please authenticate via /api/oauth/google');
        }

        const oauth2Client = new google.auth.OAuth2(
            this.clientId,
            this.clientSecret,
            this.redirectUri
        );

        // Set credentials
        oauth2Client.setCredentials({
            access_token: tokenData.accessToken,
            refresh_token: tokenData.refreshToken,
            expiry_date: tokenData.expiresAt.getTime()
        });

        // Check if token is expired and refresh if needed
        const now = new Date();
        if (tokenData.expiresAt < now) {
            console.log('Access token expired, refreshing...');

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

                console.log('Token refreshed successfully');
            } catch (err) {
                console.error('Failed to refresh token:', err);
                throw new Error('Failed to refresh Google OAuth token. Please re-authenticate.');
            }
        }

        return google.drive({ version: 'v3', auth: oauth2Client });
    }

    /**
     * Find or create a folder by name
     * @param {string} folderName - Name of the folder
     * @param {string} parentId - Parent folder ID (optional)
     * @returns {Promise<string>} Folder ID
     */
    async findOrCreateFolder(folderName, parentId = null) {
        const drive = await this.getDriveClient();

        // Search for existing folder
        let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        const searchResponse = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        if (searchResponse.data.files && searchResponse.data.files.length > 0) {
            return searchResponse.data.files[0].id;
        }

        // Create folder if it doesn't exist
        const folderMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : []
        };

        const createResponse = await drive.files.create({
            resource: folderMetadata,
            fields: 'id'
        });

        console.log(`Created folder: ${folderName} (ID: ${createResponse.data.id})`);
        return createResponse.data.id;
    }

    /**
     * Upload a file to Google Drive
     * @param {string} filePath - Local path to the file
     * @param {string} machineName - Name of the machine (for folder organization)
     * @param {object} metadata - Additional metadata (optional)
     * @returns {Promise<object>} Upload result with file ID and web link
     */
    async uploadFile(filePath, machineName, metadata = {}) {
        try {
            const drive = await this.getDriveClient();

            // Create folder structure: /Vorsight/MachineName/YYYY-MM-DD/
            const dateFolder = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            const vorsightFolderId = await this.findOrCreateFolder('Vorsight');
            const machineFolderId = await this.findOrCreateFolder(machineName, vorsightFolderId);
            const dateFolderId = await this.findOrCreateFolder(dateFolder, machineFolderId);

            // Prepare file metadata
            const fileMetadata = {
                name: path.basename(filePath),
                parents: [dateFolderId],
                description: metadata.description || `Screenshot from ${machineName} at ${new Date().toISOString()}`
            };

            // Upload file
            const media = {
                mimeType: metadata.mimeType || 'image/png',
                body: fs.createReadStream(filePath)
            };

            const response = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink'
            });

            console.log(`File uploaded successfully: ${response.data.id}`);

            return {
                success: true,
                fileId: response.data.id,
                webViewLink: response.data.webViewLink,
                webContentLink: response.data.webContentLink
            };
        } catch (err) {
            console.error('Error uploading to Google Drive:', err);
            throw err;
        }
    }

    /**
     * Check if Google Drive is connected
     * @returns {Promise<boolean>}
     */
    async isConnected() {
        try {
            const tokenData = await prisma.oAuthToken.findFirst({
                where: { provider: 'google' }
            });
            return !!tokenData;
        } catch (err) {
            return false;
        }
    }
}

module.exports = new GoogleDriveService();
