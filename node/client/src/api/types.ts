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

export interface AgentSettings {
    screenshotIntervalSeconds: number;
    pingIntervalSeconds: number;
    isMonitoringEnabled: boolean;
    isAuditEnabled: boolean;
    // Audit Log Source Filters
    auditLogSecurityEnabled?: boolean;
    auditLogSystemEnabled?: boolean;
    auditLogApplicationEnabled?: boolean;
    isScreenshotEnabled: boolean; // Separate from interval - feature on/off
    isActivityEnabled: boolean;   // Separate from interval - feature on/off
    isAccessControlEnabled: boolean; // Schedule-based access control
    filterDuplicateScreenshots?: boolean; // Screenshot deduplication
    screenshotIntervalSecondsWhenEnabled?: number; // Preserves value when disabled
    pingIntervalSecondsWhenEnabled?: number; // Preserves value when disabled
    // Ping monitor data
    lastPingTime?: string;
    lastPingSuccess?: string;
    pingLatency?: number;
}

export interface TimeWindow {
    dayOfWeek: number; // 0=Sunday
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
}

export interface AccessSchedule {
    scheduleId: string;
    childUsername: string;
    isActive: boolean;
    allowedTimeWindows: TimeWindow[];
    dailyTimeLimitMinutes: number;
    weekendBonusMinutes: number;
    createdUtc: string;
    modifiedUtc: string;
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
