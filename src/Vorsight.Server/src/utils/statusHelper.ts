import { Machine, MachineState } from '@prisma/client';
import { MachineSettings } from '../types';

export interface MachineWithState extends Partial<Machine> {
    lastSeen: Date | null;
    connectionStatus?: string;
    settings?: string | null;
    state?: MachineState | null;
    pingStatus?: string;
}

export interface ConnectionStatus {
    isOnline: boolean;
    connectionStatus: 'online' | 'offline' | 'unstable' | 'reachable';
}

/**
 * Generate rich status text based on machine connection state
 */
export function getStatusText(machine: MachineWithState): string {
    const now = new Date();

    // ONLINE - Connected and active
    if (machine.connectionStatus === 'online') {
        const lastSeen = machine.lastSeen;
        if (!lastSeen) return 'Connected'; // Should not happen if online

        const secondsSince = Math.floor((now.getTime() - lastSeen.getTime()) / 1000);

        // Just connected
        if (secondsSince < 10) {
            return 'Connected';
        }

        // Show countdown to next heartbeat (expected every 60s)
        const nextHeartbeat = Math.max(0, 60 - secondsSince);
        if (nextHeartbeat > 45) {
            return 'Active';
        } else if (nextHeartbeat > 0) {
            return `Heartbeat in ${nextHeartbeat}s`;
        }

        return 'Waiting for heartbeat...';
    }

    // REACHABLE - Machine is on but service is down
    if (machine.connectionStatus === 'reachable') {
        try {
            const settings: MachineSettings = machine.settings ? JSON.parse(machine.settings) : {};

            if (settings.lastPingSuccess) {
                const pingTime = new Date(settings.lastPingSuccess);
                const elapsed = Math.floor((now.getTime() - pingTime.getTime()) / 1000);

                // Recent ping (< 5 min)
                if (elapsed < 300) {
                    const mins = Math.floor(elapsed / 60);
                    if (mins === 0) {
                        return `Machine on · Service stopped`;
                    }
                    return `Machine on · Service stopped ${mins}m ago`;
                }

                // Show time of last ping
                const timeStr = pingTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                return `Machine on · Service down since ${timeStr}`;
            }
        } catch (e) {
            // Fallback
        }
        return 'Machine reachable · Service not running';
    }

    // UNSTABLE - Recently seen but now disconnected
    if (machine.connectionStatus === 'unstable') {
        if (machine.lastSeen) {
            const lastSeenTime = machine.lastSeen;
            const elapsed = Math.floor((now.getTime() - lastSeenTime.getTime()) / 1000);
            const mins = Math.floor(elapsed / 60);

            if (mins < 10) {
                return `Connection lost ${mins}m ago`;
            }
        }
        return 'Connection unstable';
    }

    // OFFLINE - Machine is not responding
    if (machine.lastSeen) {
        const offlineSince = machine.lastSeen;
        const elapsed = Math.floor((now.getTime() - offlineSince.getTime()) / 1000);

        // Show relative time for recent disconnects
        if (elapsed < 3600) { // < 1 hour
            const mins = Math.floor(elapsed / 60);
            return `Offline for ${mins}m`;
        }

        if (elapsed < 86400) { // < 1 day
            const hours = Math.floor(elapsed / 3600);
            return `Offline for ${hours}h`;
        }

        // Show absolute time for longer disconnects
        const timeStr = offlineSince.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const dateStr = offlineSince.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        return `Offline since ${timeStr} · ${dateStr}`;
    }

    return 'Never connected';
}

/**
 * Get connection status details from last_seen timestamp
 * Optionally provide pingIntervalSeconds for dynamic timeout calculation
 */
export function getConnectionStatus(lastSeen: Date | string | null, pingIntervalSeconds: number = 30): ConnectionStatus {
    if (!lastSeen) {
        return {
            isOnline: false,
            connectionStatus: 'offline'
        };
    }

    const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    const now = new Date();
    const elapsed = now.getTime() - lastSeenDate.getTime();

    // Online if seen within 1 heartbeat interval (default 30s)
    const onlineThreshold = pingIntervalSeconds * 1000;
    if (elapsed < onlineThreshold) {
        return {
            isOnline: true,
            connectionStatus: 'online'
        };
    }

    // Unstable if seen within 3 heartbeat intervals (reconnecting)
    const unstableThreshold = pingIntervalSeconds * 3 * 1000;
    if (elapsed < unstableThreshold) {
        return {
            isOnline: false,
            connectionStatus: 'unstable'
        };
    }

    return {
        isOnline: false,
        connectionStatus: 'offline'
    };
}
