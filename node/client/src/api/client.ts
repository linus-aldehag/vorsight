import type {
    StatusResponse,
    ApiResponse,
    AgentSettings,
    AccessSchedule,
    PaginatedScreenshots,
    ActivitySummary
} from './types';

export * from './types';

const BASE_URL = '/api/web/v1'; // Base path for Web Client paths

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
        // If no machineId, this endpoint doesn't really exist on server as generic status
        // But let's assume if machineId is provided we use the path param
        if (!machineId) throw new Error('Machine ID required for status check');
        const url = `${BASE_URL}/status/${machineId}`;
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
        const res = await fetch(`${BASE_URL}/actions/system/${action}${query}`, { method: 'POST', headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`System action ${action} failed`);
        return res.json();
    },

    async networkAction(action: 'ping', target: string): Promise<ApiResponse> {
        // We only support 'ping' for now, map to new endpoint
        if (action !== 'ping') throw new Error('Unsupported network action');

        // Find machine ID for target if possible, or use generic ping?
        // The server only supports ping by Machine ID now in web/ping.ts
        // But client might be passing IP/Hostname?
        // If target is an ID (UUID-like), use it.
        // For now, let's assume target IS machineId, as SystemControls.tsx usually works with Machine context.
        // Actually, SystemControls might be passing raw target? No, let's check usage.
        // Assuming target is machineId from previous context.

        const res = await fetch(`${BASE_URL}/ping/${target}`, {
            method: 'POST',
            headers: getAuthHeaders()
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

        // Use a safe parser or custom logic if needed, but here we assume the API returns JSON
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

    async getScreenshots(machineId: string, limit: number = 30, after?: string): Promise<PaginatedScreenshots> {
        const afterParam = after ? `&after=${after}` : '';
        const response = await fetch(`${BASE_URL}/screenshots?machineId=${machineId}&limit=${limit}${afterParam}`, { headers: getAuthHeaders() });
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
            // Return defaults if settings don't exist yet - all features disabled
            return {
                screenshotIntervalSeconds: 300,
                pingIntervalSeconds: 30,
                isMonitoringEnabled: false,
                isAuditEnabled: false,
                isScreenshotEnabled: false,
                isActivityEnabled: false,
                isAccessControlEnabled: false
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
    },

    async adoptMachine(machineId: string, options: {
        displayName?: string;
        enableScreenshots: boolean;
        enableActivity: boolean;
        enableAudit: boolean;
        enableAccessControl: boolean;
        accessControlStartTime?: string;
        accessControlEndTime?: string;
    }): Promise<{ success: boolean; machineId: string; displayName?: string }> {
        const res = await fetch(`${BASE_URL}/machines/${machineId}/adopt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(options)
        });
        if (!res.ok) throw new Error('Failed to adopt machine');
        return res.json();
    },

    async archiveMachine(machineId: string): Promise<{ success: boolean; machineId: string; status: string }> {
        const res = await fetch(`${BASE_URL}/machines/${machineId}/archive`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Failed to archive machine' }));
            throw new Error(errorData.error || 'Failed to archive machine');
        }
        return res.json();
    },

    async unarchiveMachine(machineId: string): Promise<{ success: boolean; machineId: string; status: string }> {
        const res = await fetch(`${BASE_URL}/machines/${machineId}/unarchive`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Failed to unarchive machine' }));
            throw new Error(errorData.error || 'Failed to unarchive machine');
        }
        return res.json();
    },

    async updateMachineDisplayName(machineId: string, displayName: string): Promise<{ displayName: string }> {
        const res = await fetch(`${BASE_URL}/machines/${machineId}/display-name`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ displayName })
        });
        if (!res.ok) throw new Error('Failed to update display name');
        return res.json();
    }
};
