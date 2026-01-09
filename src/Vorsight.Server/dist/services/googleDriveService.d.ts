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
declare class GoogleDriveService {
    private clientId;
    private clientSecret;
    private redirectUri;
    constructor();
    /**
     * Get authenticated Google Drive client
     * Automatically refreshes expired tokens
     */
    getDriveClient(): Promise<import("googleapis").drive_v3.Drive>;
    /**
     * Find or create a folder by name
     * @param {string} folderName - Name of the folder
     * @param {string} parentId - Parent folder ID (optional)
     * @returns {Promise<string>} Folder ID
     */
    findOrCreateFolder(folderName: string, parentId?: string | null): Promise<string>;
    /**
     * Upload a file to Google Drive
     * @param {string} filePath - Local path to the file
     * @param {string} machineName - Name of the machine (for folder organization)
     * @param {object} metadata - Additional metadata (optional)
     * @returns {Promise<object>} Upload result with file ID and web link
     */
    uploadFile(filePath: string, machineName: string, metadata?: FileMetadata): Promise<UploadResult>;
    /**
     * Check if Google Drive is connected
     * @returns {Promise<boolean>}
     */
    isConnected(): Promise<boolean>;
}
declare const _default: GoogleDriveService;
export default _default;
//# sourceMappingURL=googleDriveService.d.ts.map