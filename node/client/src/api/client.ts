import api from '@/lib/axios';
import type {
    StatusResponse,
    ApiResponse,
    AgentSettings,
    PaginatedScreenshots,
    ActivitySummary
} from './types';

export * from './types';

export const VorsightApi = {
    async getStatus(machineId?: string): Promise<StatusResponse> {
        // If no machineId, this endpoint doesn't really exist on server as generic status
        // But let's assume if machineId is provided we use the path param
        if (!machineId) throw new Error('Machine ID required for status check');
        const url = `/status/${machineId}`;
        const res = await api.get(url);
        return res.data;
    },

    async requestScreenshot(machineId?: string): Promise<void> {
        const url = machineId ? `/screenshots/request?machineId=${machineId}` : `/screenshots/request`;
        await api.post(url);
    },

    async systemAction(action: 'shutdown' | 'logout', machineId?: string): Promise<ApiResponse> {
        const query = machineId ? `?machineId=${machineId}` : '';
        const res = await api.post(`/actions/system/${action}${query}`);
        return res.data;
    },

    async networkAction(action: 'ping', target: string): Promise<ApiResponse> {
        // We only support 'ping' for now, map to new endpoint
        if (action !== 'ping') throw new Error('Unsupported network action');

        const res = await api.post(`/ping/${target}`);
        return res.data;
    },

    // Removed getSchedule and saveSchedule methods

    async getScreenshots(machineId: string, limit: number = 30, after?: string): Promise<PaginatedScreenshots> {
        const afterParam = after ? `&after=${after}` : '';
        const response = await api.get(`/screenshots?machineId=${machineId}&limit=${limit}${afterParam}`);
        return response.data;
    },

    async getActivitySummary(machineId?: string): Promise<ActivitySummary> {
        if (!machineId) {
            return { totalActiveHours: 0, timeline: [], topApps: [], lastActive: new Date().toISOString() };
        }
        const res = await api.get(`/analytics/summary/${machineId}`);
        return res.data;
    },

    async getSettings(machineId?: string): Promise<AgentSettings> {
        const url = machineId ? `/settings?machineId=${machineId}` : `/settings`;
        try {
            const res = await api.get(url);
            return res.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                // Return defaults if settings don't exist yet - all features disabled
                return {
                    screenshots: {
                        enabled: false,
                        intervalSeconds: 300,
                        filterDuplicates: true
                    },

                    audit: {
                        enabled: false,
                        filters: {
                            security: true,
                            system: true,
                            application: true
                        }
                    },
                    activity: {
                        enabled: false,
                        intervalSeconds: 30
                    },
                    accessControl: {
                        enabled: false,
                        violationAction: 'logoff',
                        schedule: []
                    }
                };
            }
            throw error;
        }
    },

    async saveSettings(machineId: string, settings: AgentSettings): Promise<AgentSettings> {
        const res = await api.post(`/settings`, { machineId, ...settings });
        return res.data;
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
        const res = await api.post(`/machines/${machineId}/adopt`, options);
        return res.data;
    },

    async archiveMachine(machineId: string): Promise<{ success: boolean; machineId: string; status: string }> {
        try {
            const res = await api.patch(`/machines/${machineId}/archive`);
            return res.data;
        } catch (error: any) {
            const errorData = error.response?.data || { error: 'Failed to archive machine' };
            throw new Error(errorData.error || 'Failed to archive machine');
        }
    },

    async unarchiveMachine(machineId: string): Promise<{ success: boolean; machineId: string; status: string }> {
        try {
            const res = await api.patch(`/machines/${machineId}/unarchive`);
            return res.data;
        } catch (error: any) {
            const errorData = error.response?.data || { error: 'Failed to unarchive machine' };
            throw new Error(errorData.error || 'Failed to unarchive machine');
        }
    },

    async updateMachineDisplayName(machineId: string, displayName: string): Promise<{ displayName: string }> {
        const res = await api.patch(`/machines/${machineId}/display-name`, { displayName });
        return res.data;
    }
};
