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
    screenshotIntervalSecondsWhenEnabled?: number; // Preserves value when disabled
    pingIntervalSecondsWhenEnabled?: number; // Preserves value when disabled
}

const BASE_URL = '/api'; // Relative URL - same server (localhost:3000)

// Helper to get authorization headers
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export const VorsightApi = {
    async getStatus(machineId?: string): Promise<StatusResponse> {
        const url = machineId ? `${BASE_URL}/status?machineId=${machineId}` : `${BASE_URL}/status`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
        return res.json();
    },

    async requestScreenshot(machineId?: string): Promise<void> {
        const url = machineId ? `${BASE_URL}/screenshots/request?machineId=${machineId}` : `${BASE_URL}/screenshots/request`;
        const res = await fetch(url, { method: 'POST', headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Screenshot request failed');
    },

    async systemAction(action: 'shutdown' | 'logout', machineId?: string): Promise<ApiResponse> {
        const query = machineId ? `?machineId=${machineId}` : '';
        const res = await fetch(`${BASE_URL}/system/${action}${query}`, { method: 'POST', headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`System action ${action} failed`);
        return res.json();
    },

    async networkAction(action: 'ping', target: string): Promise<ApiResponse> {
        const res = await fetch(`${BASE_URL}/network`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ action, target })
        });
        if (!res.ok) throw new Error('Network action failed');
        return res.json();
    },

    async getSchedule(machineId?: string): Promise<AccessSchedule | null> {
        const url = machineId ? `${BASE_URL}/schedule?machineId=${machineId}` : `${BASE_URL}/schedule`;
        const response = await fetch(url, { headers: getAuthHeaders() });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to fetch schedule');
        const text = await response.text();
        if (!text) return null;
        return JSON.parse(text);
    },

    async saveSchedule(machineId: string, schedule: AccessSchedule): Promise<AccessSchedule> {
        const response = await fetch(`${BASE_URL}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ machineId, ...schedule })
        });
        if (!response.ok) throw new Error('Failed to save schedule');
        return response.json();
    },

    async getScreenshots(machineId: string, limit: number = 20): Promise<DriveFile[]> {
        const response = await fetch(`${BASE_URL}/screenshots/${machineId}?limit=${limit}`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Failed to fetch screenshots');
        return response.json();
    },

    async getActivitySummary(machineId?: string): Promise<ActivitySummary> {
        if (!machineId) {
            return { totalActiveHours: 0, timeline: [], topApps: [], lastActive: new Date().toISOString() };
        }
        const res = await fetch(`${BASE_URL}/analytics/summary/${machineId}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
    },

    async getSettings(machineId?: string): Promise<AgentSettings> {
        const url = machineId ? `${BASE_URL}/settings?machineId=${machineId}` : `${BASE_URL}/settings`;
        const res = await fetch(url, { headers: getAuthHeaders() });
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

    async saveSettings(machineId: string, settings: AgentSettings): Promise<AgentSettings> {
        const res = await fetch(`${BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ machineId, ...settings })
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
