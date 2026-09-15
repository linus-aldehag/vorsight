import api from '@/lib/axios';
import { mockEngine } from './mockEngine';

export function setupMockRest() {
    // Intercept requests on the Axios instance
    api.interceptors.request.use(async (config) => {
        // Simple delay helper to simulate realistic network latency
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
        await delay(120);

        const url = config.url || '';
        const method = (config.method || 'get').toLowerCase();

        // Extract query parameters if available
        const urlObj = new URL(url, 'http://dummy.local');
        const path = urlObj.pathname.replace('/api/web/v1', '');
        const params = Object.fromEntries(urlObj.searchParams.entries());

        // Also merge params from config.params
        if (config.params) {
            Object.assign(params, config.params);
        }

        let responseData: any = null;
        let status = 200;

        // --- Route Matching ---

        // 1. Auth routes
        if (path === '/auth/status') {
            responseData = { authenticated: true, user: 'Demo Admin' };
        } else if (path === '/auth/login') {
            responseData = { token: 'demo-bearer-token-vorsight' };
        }

        // 2. Machines list
        else if (path === '/machines' && method === 'get') {
            const includeArchived = params.includeArchived === 'true';
            responseData = mockEngine.getMachines(includeArchived);
        }

        // 3. Machine status / health
        else if (path.startsWith('/status/')) {
            responseData = {
                health: {
                    screenshotsSuccessful: 142,
                    screenshotsFailed: 0,
                    uploadsSuccessful: 142,
                    uploadsFailed: 0,
                    totalScreenshotsSuccessful: 520,
                    totalScreenshotsFailed: 1,
                    totalUploadsSuccessful: 520,
                    totalUploadsFailed: 1,
                    periodDuration: '24h',
                    totalRuntime: '7d 12h'
                },
                uptime: {
                    currentStart: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
                    lastSeen: new Date().toISOString(),
                    isTracking: true
                },
                activity: {
                    activeWindowTitle: 'Visual Studio Code - Vorsight Demo',
                    timeSinceLastInput: '2s',
                    timestamp: new Date().toISOString()
                },
                audit: {
                    passed: true,
                    warnings: [],
                    timestamp: new Date().toISOString()
                }
            };
        }

        // 4. Screenshots
        else if (path === '/screenshots' && method === 'get') {
            const machineId = params.machineId as string || 'default';
            responseData = mockEngine.getScreenshots(machineId);
        } else if (path === '/screenshots/request') {
            responseData = { success: true, message: 'Screenshot requested successfully' };
        }

        // 5. Analytics & Activity
        else if (path.startsWith('/analytics/summary/')) {
            const machineId = path.replace('/analytics/summary/', '');
            responseData = mockEngine.getActivitySummary(machineId);
        } else if (path.startsWith('/activity/')) {
            const machineId = path.replace('/activity/', '');
            const limit = params.limit ? parseInt(params.limit as string, 10) : 100;
            const offset = params.offset ? parseInt(params.offset as string, 10) : 0;
            responseData = mockEngine.getActivityLogs(machineId, limit, offset);
        }

        // 6. Settings
        else if (path === '/settings' && method === 'get') {
            const machineId = params.machineId as string;
            responseData = mockEngine.getSettings(machineId);
        } else if (path === '/settings' && method === 'post') {
            const { machineId, ...settings } = config.data || {};
            responseData = mockEngine.saveSettings(machineId, settings);
        }

        // 7. Machine adoption & management
        else if (path.match(/\/machines\/[^/]+\/adopt$/)) {
            const machineId = path.split('/')[2];
            const { displayName } = config.data || {};
            responseData = mockEngine.adoptMachine(machineId, displayName);
        } else if (path.match(/\/machines\/[^/]+\/archive$/)) {
            const machineId = path.split('/')[2];
            responseData = mockEngine.archiveMachine(machineId);
        } else if (path.match(/\/machines\/[^/]+\/unarchive$/)) {
            const machineId = path.split('/')[2];
            responseData = mockEngine.unarchiveMachine(machineId);
        } else if (path.match(/\/machines\/[^/]+\/display-name$/)) {
            const machineId = path.split('/')[2];
            const { displayName } = config.data || {};
            responseData = mockEngine.updateMachineDisplayName(machineId, displayName);
        }

        // 8. Actions
        else if (path.startsWith('/actions/system/')) {
            const action = path.replace('/actions/system/', '').split('?')[0];
            const machineId = params.machineId as string || 'machine-gaming-01';
            responseData = mockEngine.triggerSystemAction(action, machineId);
        } else if (path.startsWith('/ping/')) {
            const target = path.replace('/ping/', '');
            responseData = { status: 'success', target, latency: '14ms', reachable: true };
        }

        // 9. Audit events & acknowledgment
        else if (path === '/audit' && method === 'get') {
            const machineId = params.machineId as string;
            const limit = params.limit ? parseInt(params.limit as string, 10) : 100;
            const unacknowledgedOnly = params.unacknowledgedOnly === 'true';
            responseData = mockEngine.getAuditEvents(machineId, limit, unacknowledgedOnly);
        } else if (path.match(/\/audit\/[^/]+\/acknowledge$/)) {
            const eventId = parseInt(path.split('/')[2], 10);
            const { acknowledged } = config.data || { acknowledged: true };
            responseData = mockEngine.acknowledgeAuditEvent(eventId, acknowledged);
        } else if (path.startsWith('/media/view/')) {
            const screenshots = mockEngine.getScreenshots('default');
            responseData = screenshots.screenshots[0]?.thumbnailLink || '#';
        }

        // 10. Machine logs
        else if (path.startsWith('/logs/')) {
            const machineId = path.replace('/logs/', '');
            responseData = mockEngine.getLogs(machineId);
        }

        // 11. OAuth status & Google Drive connection
        else if (path === '/oauth/status') {
            responseData = mockEngine.getOAuthStatus();
        } else if (path === '/oauth/google/connect') {
            responseData = mockEngine.setOAuthConnected(true);
        } else if (path === '/oauth/google/disconnect') {
            responseData = mockEngine.setOAuthConnected(false);
        }

        // 12. Data Retention & Cleanup
        else if (path === '/cleanup' && method === 'get') {
            responseData = mockEngine.getCleanupSettings();
        } else if (path === '/cleanup' && method === 'put') {
            responseData = mockEngine.saveCleanupSettings(config.data || {});
        } else if (path === '/cleanup/run' && method === 'post') {
            responseData = mockEngine.runCleanup();
        }

        // Default fallback if unhandled
        else {
            responseData = { status: 'ok', mock: true };
        }

        // Return an adapter promise that cancels actual HTTP dispatch and returns mock AxiosResponse
        config.adapter = async () => {
            return {
                data: responseData,
                status,
                statusText: 'OK',
                headers: { 'content-type': 'application/json' },
                config,
                request: {}
            };
        };

        return config;
    });
}
