import { Machine, MachineState, ActivityHistory, ActivitySession, Screenshot, SettingsQueue, AuditEvent, OAuthToken, ConnectionEvent, CleanupSettings, Prisma } from '@prisma/client';
export { Machine, MachineState, ActivityHistory, ActivitySession, Screenshot, SettingsQueue, AuditEvent, OAuthToken, ConnectionEvent, CleanupSettings, Prisma };
export interface MachineMetadata {
    os?: string;
    osVersion?: string;
    arch?: string;
    cpus?: number;
    memory?: number;
    [key: string]: any;
}
export interface MachineSettings {
    screenshotIntervalSeconds: number;
    pingIntervalSeconds: number;
    isMonitoringEnabled: boolean;
    isAuditEnabled: boolean;
    [key: string]: any;
}
export interface HealthStatus {
    cpuLoad: number;
    memoryUsage: number;
    uptime: number;
    [key: string]: any;
}
export interface SocketAuthData {
    machineId: string;
    apiKey: string;
    version?: string;
}
export interface ActivityPayload {
    timestamp: string | Date;
    activeWindow: string;
    processName: string;
    duration?: number;
    username?: string;
}
export interface StatePayload {
    lastActivityTime: string | Date;
    activeWindow: string;
    screenshotCount: number;
    uploadCount: number;
    health: HealthStatus;
    version?: string;
}
export interface AuditEventPayload {
    eventId: string;
    eventType: string;
    username: string;
    timestamp: string | Date;
    details: string;
    sourceLogName: string;
    isFlagged: boolean;
}
export interface ScreenshotPayload {
    id: string;
    captureTime: string | Date;
    triggerType: string;
    googleDriveFileId?: string;
    isUploaded: boolean;
}
export interface JwtUserPayload {
    id?: string;
    username?: string;
    role?: string;
    iat?: number;
    exp?: number;
    [key: string]: any;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    [key: string]: any;
}
//# sourceMappingURL=index.d.ts.map