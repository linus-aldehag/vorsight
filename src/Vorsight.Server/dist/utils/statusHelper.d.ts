import { Machine, MachineState } from '@prisma/client';
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
export declare function getStatusText(machine: MachineWithState): string;
/**
 * Get connection status details from last_seen timestamp
 * Optionally provide pingIntervalSeconds for dynamic timeout calculation
 */
export declare function getConnectionStatus(lastSeen: Date | string | null, pingIntervalSeconds?: number): ConnectionStatus;
//# sourceMappingURL=statusHelper.d.ts.map