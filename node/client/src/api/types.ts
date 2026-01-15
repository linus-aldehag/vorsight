export interface HealthReport {
    screenshotsSuccessful: number;
    screenshotsFailed: number;
    uploadsSuccessful: number;
    uploadsFailed: number;
    totalScreenshotsSuccessful: number;
    totalScreenshotsFailed: number;
    totalUploadsSuccessful: number;
    totalUploadsFailed: number;
    periodDuration: string;
    totalRuntime: string;
}

export interface UptimeStatus {
    currentStart: string | null;
    lastSeen: string | null;
    isTracking: boolean;
}

export interface ActivitySnapshot {
    activeWindowTitle: string;
    timeSinceLastInput: string;
    timestamp: string;
}

export interface AuditReport {
    passed: boolean;
    warnings: string[];
    timestamp: string;
}

export interface StatusResponse {
    health: HealthReport;
    uptime: UptimeStatus;
    activity: ActivitySnapshot | null;
    audit: AuditReport | null;
}

export interface ApiResponse {
    status: string;
    [key: string]: any;
}



export interface ScreenshotSettings {
    enabled: boolean;
    intervalSeconds: number;
    filterDuplicates: boolean;
}

export interface ActivitySettings {
    enabled: boolean;
    intervalSeconds: number;
}

export interface AuditFilters {
    security: boolean;
    system: boolean;
    application: boolean;
}

export interface AuditSettings {
    enabled: boolean;
    filters: AuditFilters;
}

export interface AccessControlSettings {
    enabled: boolean;
    scheduleMode?: 'simple' | 'custom';
    violationAction: 'logoff' | 'shutdown';
    schedule: TimeWindow[];
}

export interface AgentSettings {

    screenshots: ScreenshotSettings;
    activity: ActivitySettings;
    audit: AuditSettings;
    accessControl: AccessControlSettings;
}

export interface TimeWindow {
    dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
}

export interface DriveFile {
    id: string;
    name: string;
    createdTime: string;
    webViewLink: string;
    webContentLink?: string;
    thumbnailLink?: string;
}

export interface PaginatedScreenshots {
    screenshots: DriveFile[];
    hasMore: boolean;
    cursor: string | null;
}

export interface ActivitySummary {
    totalActiveHours: number;
    timeline: { hour: number; activeMinutes: number }[];
    topApps: { name: string; percentage: number }[];
    lastActive: string;
}
