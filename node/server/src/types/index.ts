// Shared Types
import {
    Machine,
    MachineState,
    ActivityHistory,
    ActivitySession,
    Screenshot,
    SettingsQueue,
    AuditEvent,
    OAuthToken,
    ConnectionEvent,
    CleanupSettings,
    Prisma
} from '@prisma/client';

// Re-export Prisma types
export {
    Machine,
    MachineState,
    ActivityHistory,
    ActivitySession,
    Screenshot,
    SettingsQueue,
    AuditEvent,
    OAuthToken,
    ConnectionEvent,
    CleanupSettings,
    Prisma
};

// Machine Metadata Structure
export interface MachineMetadata {
    os?: string;
    osVersion?: string;
    arch?: string;
    cpus?: number;
    memory?: number;
    [key: string]: any;
}

// Machine Settings Structure (Legacy - for migration)
export interface LegacyMachineSettings {
    screenshotIntervalSeconds: number;
    pingIntervalSeconds: number;
    isMonitoringEnabled: boolean;
    isAuditEnabled: boolean;
    [key: string]: any;
}

export interface NetworkSettings {
    pingIntervalSeconds: number;
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
    violationAction: 'logoff' | 'shutdown';
    schedule: AccessScheduleWindow[];
}

export interface AccessScheduleWindow {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

export interface MachineSettings {
    network: NetworkSettings;
    screenshots: ScreenshotSettings;
    activity: ActivitySettings;
    audit: AuditSettings;
    accessControl: AccessControlSettings;
}

// Health Status Structure
export interface HealthStatus {
    cpuLoad: number;
    memoryUsage: number;
    uptime: number;
    [key: string]: any;
}

// WebSocket Authentication
export interface SocketAuthData {
    machineId: string;
    apiKey: string;
    version?: string;
}

// Activity Update Payload
export interface ActivityPayload {
    timestamp: string | Date;
    activeWindow: string;
    processName: string;
    duration?: number;
    username?: string;
}

// State Update Payload
export interface StatePayload {
    lastActivityTime: string | Date;
    activeWindow: string;
    screenshotCount: number;
    uploadCount: number;
    health: HealthStatus;
    version?: string;
}

// Audit Event Payload
export interface AuditEventPayload {
    eventId: string;
    eventType: string;
    username: string;
    timestamp: string | Date;
    details: string;
    sourceLogName: string;
    isFlagged: boolean;
}

// Screenshot Payload
export interface ScreenshotPayload {
    id: string;
    captureTime: string | Date;
    triggerType: string;
    googleDriveFileId?: string;
    isUploaded: boolean;
}

// Auth Token Payload
export interface JwtUserPayload {
    id?: string;
    username?: string;
    role?: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
}

// Generic Response wrapper
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    [key: string]: any;
}
