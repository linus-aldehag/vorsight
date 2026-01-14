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

export * from './settings.gen';
export * from './payloads.gen';

// Machine Settings Structure (Legacy - for migration)
export interface LegacyMachineSettings {
    screenshotIntervalSeconds: number;
    pingIntervalSeconds: number;
    isMonitoringEnabled: boolean;
    isAuditEnabled: boolean;
    [key: string]: any;
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
