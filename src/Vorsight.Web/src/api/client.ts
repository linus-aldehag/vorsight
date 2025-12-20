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

export interface AgentSettings {
    screenshotIntervalSeconds: number;
    pingIntervalSeconds: number;
    isMonitoringEnabled: boolean;
}

const BASE_url = 'http://localhost:5050/api';

export const VorsightApi = {
    async getStatus(): Promise<StatusResponse> {
        const res = await fetch(`${BASE_url}/status`);
        if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
        return res.json();
    },

    async requestScreenshot(type: string = 'Manual'): Promise<void> {
        const res = await fetch(`${BASE_url}/screenshot?type=${encodeURIComponent(type)}`, { method: 'POST' });
        if (!res.ok) throw new Error('Screenshot request failed');
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

    async getSchedule(): Promise<AccessSchedule | null> {
        const response = await fetch(`${BASE_url}/schedule`);
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to fetch schedule');
        const text = await response.text();
        if (!text) return null; // Handle empty response
        return JSON.parse(text);
    },

    async saveSchedule(schedule: AccessSchedule): Promise<AccessSchedule> {
        const response = await fetch(`${BASE_url}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(schedule)
        });
        if (!response.ok) throw new Error('Failed to save schedule');
        return response.json();
    },

    async getScreenshots(limit: number = 20): Promise<DriveFile[]> {
        const response = await fetch(`${BASE_url}/screenshots?limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch screenshots');
        return response.json();
    },

    async getActivitySummary(): Promise<ActivitySummary> {
        const res = await fetch(`${BASE_url}/analytics/summary`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
    },

    async getSettings(): Promise<AgentSettings> {
        const res = await fetch(`${BASE_url}/settings`);
        if (res.status === 404) {
            // Return defaults if settings don't exist yet
            return {
                screenshotIntervalSeconds: 60,
                pingIntervalSeconds: 30,
                isMonitoringEnabled: true
            };
        }
        if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
        return res.json();
    },

    async saveSettings(settings: AgentSettings): Promise<AgentSettings> {
        const res = await fetch(`${BASE_url}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error('Failed to save settings');
        return res.json();
    }
};

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

export interface TimeWindow {
    dayOfWeek: number; // 0=Sunday
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

export interface ActivitySummary {
    totalActiveHours: number;
    timeline: { hour: number; activeMinutes: number }[];
    topApps: { name: string; percentage: number }[];
    lastActive: string;
}
