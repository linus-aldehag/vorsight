import { google } from 'googleapis';
import { prisma } from '../db/database';
import fs from 'fs';
import path from 'path';

export interface UploadResult {
    success: boolean;
    fileId: string;
    webViewLink?: string | null;
    webContentLink?: string | null;
}

export interface FileMetadata {
    description?: string;
    mimeType?: string;
}

class GoogleDriveService {
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;

    constructor() {
        this.clientId = process.env.GOOGLE_CLIENT_ID || '';
        this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/google/callback';
    }

    async getDriveClient() {
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

        oauth2Client.setCredentials({
            access_token: tokenData.accessToken,
            refresh_token: tokenData.refreshToken,
            expiry_date: tokenData.expiresAt.getTime()
        });

        const now = new Date();
        if (tokenData.expiresAt < now) {
            console.log('Access token expired, refreshing...');

            try {
                const { credentials } = await oauth2Client.refreshAccessToken();

                if (!credentials.access_token || !credentials.expiry_date) {
                    throw new Error('Invalid refresh token response');
                }

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

    async findOrCreateFolder(folderName: string, parentId: string | null = null): Promise<string> {
        const drive = await this.getDriveClient();

        let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
        if (parentId) {
            query += ` and '${parentId}' in parents`;
        }

        try {
            const searchResponse = await drive.files.list({
                q: query,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            const files = searchResponse.data.files;
            if (files && files.length > 0) {
                const firstFile = files[0];
                if (firstFile && firstFile.id) return firstFile.id;
            }
        } catch (e) {
            // Ignore search errors
        }

        const folderMetadata: any = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentId ? [parentId] : []
        };

        const createResponse = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id'
        });

        if (!createResponse.data.id) {
            throw new Error('Failed to create folder');
        }

        console.log(`Created folder: ${folderName} (ID: ${createResponse.data.id})`);
        return createResponse.data.id;
    }

    async uploadFile(filePath: string, machineName: string, metadata: FileMetadata = {}): Promise<UploadResult> {
        try {
            const drive = await this.getDriveClient();

            const dateFolder = new Date().toISOString().split('T')[0];

            const vorsightFolderId = await this.findOrCreateFolder('Vorsight');
            const machineFolderId = await this.findOrCreateFolder(machineName, vorsightFolderId);
            const dateFolderId = await this.findOrCreateFolder(dateFolder, machineFolderId);

            const fileMetadata = {
                name: path.basename(filePath),
                parents: [dateFolderId],
                description: metadata.description || `Screenshot from ${machineName} at ${new Date().toISOString()}`
            };

            const media = {
                mimeType: metadata.mimeType || 'image/png',
                body: fs.createReadStream(filePath)
            };

            const response = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink, webContentLink'
            });

            console.log(`File uploaded successfully: ${response.data.id}`);

            return {
                success: true,
                fileId: response.data.id || '',
                webViewLink: response.data.webViewLink,
                webContentLink: response.data.webContentLink
            };
        } catch (err) {
            console.error('Error uploading to Google Drive:', err);
            throw err;
        }
    }

    async isConnected(): Promise<boolean> {
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

export default new GoogleDriveService();
