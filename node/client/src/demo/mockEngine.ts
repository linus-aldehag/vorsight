import type { Machine } from '@/context/MachineContext';
import type { AgentSettings, ActivitySummary, PaginatedScreenshots } from '@/api/types';
import type { AuditEvent } from '@/hooks/useAudit';
import {
    INITIAL_MACHINES,
    DEFAULT_AGENT_SETTINGS,
    INITIAL_AUDIT_EVENTS,
    generateMockActivitySummary,
    generateMockScreenshots,
    generateMockActivityLogs
} from './mockData';

type DemoEventListener = (event: string, data: any) => void;

class MockEngine {
    private machines: Machine[] = [...INITIAL_MACHINES];
    private settings: Map<string, AgentSettings> = new Map();
    private auditEvents: AuditEvent[] = [...INITIAL_AUDIT_EVENTS];
    private eventListeners: Set<DemoEventListener> = new Set();
    private timerId: number | null = null;
    private nextAuditId = 100;

    constructor() {
        // Initialize settings for default machines
        this.machines.forEach(m => {
            this.settings.set(m.id, JSON.parse(JSON.stringify(DEFAULT_AGENT_SETTINGS)));
        });
    }

    public startTimers() {
        if (this.timerId !== null) return;

        // Background loop running every 7 seconds
        this.timerId = window.setInterval(() => {
            this.simulateBackgroundTick();
        }, 7000);
    }

    public stopTimers() {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    public addEventListener(listener: DemoEventListener) {
        this.eventListeners.add(listener);
        return () => this.eventListeners.delete(listener);
    }

    private emit(event: string, data: any) {
        this.eventListeners.forEach(listener => listener(event, data));
    }

    // --- State Queries ---

    public getMachines(includeArchived: boolean = false): Machine[] {
        return this.machines.filter(m => includeArchived || m.status !== 'archived');
    }

    public getMachine(machineId: string): Machine | undefined {
        return this.machines.find(m => m.id === machineId);
    }

    public getSettings(machineId?: string): AgentSettings {
        if (!machineId) return DEFAULT_AGENT_SETTINGS;
        return this.settings.get(machineId) || DEFAULT_AGENT_SETTINGS;
    }

    public saveSettings(machineId: string, newSettings: AgentSettings): AgentSettings {
        this.settings.set(machineId, newSettings);
        return newSettings;
    }

    public getActivitySummary(machineId?: string): ActivitySummary {
        return generateMockActivitySummary(machineId || 'default');
    }

    public getActivityLogs(machineId: string, limit: number = 100, offset: number = 0) {
        return generateMockActivityLogs(machineId, limit, offset);
    }

    public getScreenshots(machineId: string): PaginatedScreenshots {
        return generateMockScreenshots(machineId);
    }

    public getAuditEvents(machineId?: string, limit: number = 100, unacknowledgedOnly: boolean = false): AuditEvent[] {
        let events = this.auditEvents;
        if (machineId) {
            events = events.filter(e => e.machineId === machineId);
        }
        if (unacknowledgedOnly) {
            events = events.filter(e => !e.acknowledged);
        }
        return events.slice(0, limit);
    }

    public getLogs(_machineId: string) {
        return [
            { id: 1, timestamp: new Date(Date.now() - 60000).toISOString(), level: 'info', message: 'Vorsight Agent Host running (v1.6.0)', source: 'AgentHost' },
            { id: 2, timestamp: new Date(Date.now() - 180000).toISOString(), level: 'info', message: 'Screen time limits monitor active', source: 'AccessControl' },
            { id: 3, timestamp: new Date(Date.now() - 360000).toISOString(), level: 'info', message: 'Activity monitor telemetry active', source: 'ActivityMonitor' }
        ];
    }

    private oauthConnected = true;

    public getOAuthStatus() {
        return {
            connected: this.oauthConnected,
            connectedAt: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
            expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString()
        };
    }

    public setOAuthConnected(connected: boolean) {
        this.oauthConnected = connected;
        return this.getOAuthStatus();
    }

    private cleanupSettings = {
        activityRetentionDays: 90,
        screenshotRetentionDays: 30,
        auditRetentionDays: 180,
        heartbeatRetentionHours: 48,
        deleteDriveFiles: true,
        lastCleanupRun: new Date(Date.now() - 86400000).toISOString()
    };

    public getCleanupSettings() {
        return this.cleanupSettings;
    }

    public saveCleanupSettings(data: any) {
        this.cleanupSettings = { ...this.cleanupSettings, ...data };
        return this.cleanupSettings;
    }

    public runCleanup() {
        this.cleanupSettings.lastCleanupRun = new Date().toISOString();
        return {
            success: true,
            stats: {
                activityDeleted: 1420,
                screenshotsDeleted: 34,
                auditsDeleted: 12
            }
        };
    }

    public acknowledgeAuditEvent(eventId: number, acknowledged: boolean) {
        const event = this.auditEvents.find(e => e.id === eventId);
        if (event) {
            event.acknowledged = acknowledged;
        }
        this.emit('audit:alert', { eventId, acknowledged });
        return { success: true };
    }

    public triggerSystemAction(action: string, machineId?: string) {
        if (action === 'shutdown' && machineId) {
            const machine = this.machines.find(m => m.id === machineId);
            if (machine) {
                machine.isOnline = false;
                machine.connectionStatus = 'offline';
                machine.statusText = 'System Shutting Down';
                machine.pingStatus = 'Unreachable';
                machine.lastSeen = new Date().toISOString();
            }
            this.emit('machines:list', this.getMachines(true));
            this.emit('machine:offline', { machineId });
        }
        return { status: 'success', action, message: `System action '${action}' triggered` };
    }

    // --- State Actions ---

    public adoptMachine(machineId: string, displayName?: string): { success: boolean; machineId: string; displayName?: string } {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            machine.status = 'active';
            machine.isOnline = true;
            machine.connectionStatus = 'online';
            if (displayName) machine.displayName = displayName;
        }
        this.emit('machines:list', this.getMachines(true));
        return { success: true, machineId, displayName };
    }

    public archiveMachine(machineId: string): { success: boolean; machineId: string; status: string } {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            machine.status = 'archived';
        }
        this.emit('machines:list', this.getMachines(true));
        return { success: true, machineId, status: 'archived' };
    }

    public unarchiveMachine(machineId: string): { success: boolean; machineId: string; status: string } {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            machine.status = 'active';
        }
        this.emit('machines:list', this.getMachines(true));
        return { success: true, machineId, status: 'active' };
    }

    public updateMachineDisplayName(machineId: string, displayName: string): { displayName: string } {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            machine.displayName = displayName;
        }
        this.emit('machines:list', this.getMachines(true));
        return { displayName };
    }

    // --- Timed Event Simulation ---

    private simulateBackgroundTick() {
        const rand = Math.random();

        // 1. Ticking latency or status pings on online machines
        const onlineMachines = this.machines.filter(m => m.status === 'active' && m.isOnline);
        if (onlineMachines.length > 0 && rand < 0.6) {
            const target = onlineMachines[Math.floor(Math.random() * onlineMachines.length)];
            target.pingLatency = Math.floor(10 + Math.random() * 30);
            target.lastSeen = new Date().toISOString();
            this.emit('machines:list', this.getMachines(true));
        }

        // 2. Occasionally add a new security audit event
        if (rand > 0.75 && onlineMachines.length > 0) {
            const target = onlineMachines[Math.floor(Math.random() * onlineMachines.length)];
            const newEvent: AuditEvent = {
                id: ++this.nextAuditId,
                machineId: target.id,
                eventId: '7045',
                eventType: 'System',
                username: 'Kids_Play',
                timestamp: new Date().toISOString(),
                details: 'Parental control schedule check: Active session verified on ' + target.displayName,
                sourceLogName: 'System',
                isFlagged: false,
                acknowledged: false,
                createdAt: new Date().toISOString()
            };
            this.auditEvents.unshift(newEvent);
            this.emit('audit:alert', newEvent);
        }

        // 3. Simulated Machine Discovery (if no pending machines left)
        const pendingCount = this.machines.filter(m => m.status === 'pending').length;
        if (pendingCount === 0 && rand > 0.9) {
            const newId = `machine-discovered-${Date.now().toString().slice(-4)}`;
            const newPending: Machine = {
                id: newId,
                name: `Discovered-TV-Box-${Math.floor(100 + Math.random() * 900)}`,
                displayName: 'New Bedroom Media Streamer',
                hostname: `STREAMING-BOX-${Math.floor(10 + Math.random() * 89)}`,
                ipAddress: `192.168.1.${Math.floor(120 + Math.random() * 50)}`,
                isOnline: false,
                connectionStatus: 'offline',
                statusText: 'Awaiting Adoption',
                lastSeen: null,
                status: 'pending'
            };
            this.machines.push(newPending);
            this.emit('machine:discovered', {
                machineId: newPending.id,
                name: newPending.name,
                hostname: newPending.hostname
            });
            this.emit('machines:list', this.getMachines(true));
        }
    }
}

export const mockEngine = new MockEngine();
