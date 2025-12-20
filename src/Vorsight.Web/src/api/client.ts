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

export interface StatusResponse {
    health: HealthReport;
    uptime: UptimeStatus;
    activity: ActivitySnapshot | null;
    audit: AuditReport | null;
}

export interface AuditReport {
    passed: boolean;
    warnings: string[];
    timestamp: string;
}

export interface ApiResponse {
    status: string;
    [key: string]: any;
}

const BASE_url = 'http://localhost:5050/api';

export const VorsightApi = {
    async getStatus(): Promise<StatusResponse> {
        const res = await fetch(`${BASE_url}/status`);
        if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
        return res.json();
    },

    async requestScreenshot(): Promise<ApiResponse> {
        const res = await fetch(`${BASE_url}/screenshot?type=ManualWeb`, { method: 'POST' });
        if (!res.ok) throw new Error('Screenshot request failed');
        return res.json();
    },

    async systemAction(action: 'shutdown' | 'logout'): Promise<ApiResponse> {
        const res = await fetch(`${BASE_url}/system/${action}`, { method: 'POST' });
        if (!res.ok) throw new Error(`System action ${action} failed`);
        return res.json();
    },

    async networkAction(action: 'ping', target: string): Promise<ApiResponse> {
        const res = await fetch(`${BASE_url}/network`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, target })
        });
        if (!res.ok) throw new Error('Network action failed');
        return res.json();
    },

    async getActivitySummary(): Promise<ActivitySummary> {
        const res = await fetch(`${BASE_url}/analytics/summary`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
    }
};

export interface ActivitySummary {
    totalActiveHours: number;
    timeline: { hour: number; activeMinutes: number }[];
    topApps: { name: string; percentage: number }[];
    lastActive: string;
}
