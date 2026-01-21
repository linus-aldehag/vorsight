import { Card, CardContent } from '@/components/ui/card';
import { useMachine } from '@/context/MachineContext';
import { UptimeDisplay } from './components/UptimeDisplay';
import { useHealthStats } from './hooks/useHealthStats';
import useSWR from 'swr';
import { memo } from 'react';
import { useMachineLogs } from '../machines/components/MachineLogs/useMachineLogs';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, LogOut, Power } from 'lucide-react';
import { VorsightApi } from '@/api/client';
import { LiveStatusText } from './components/LiveStatusText';
import { HeartbeatProgress } from './components/HeartbeatProgress';


interface HealthStatsProps {
    version?: string | null;
    onToggleLogs: () => void;
}

export const HealthStats = memo(function HealthStats({ version, onToggleLogs }: HealthStatsProps) {
    const { selectedMachine } = useMachine();
    useHealthStats(selectedMachine?.id);

    const fetcher = async (url: string) => {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
    };

    const { data: status } = useSWR(
        selectedMachine ? `/api/web/v1/status/${selectedMachine.id}` : null,
        fetcher,
        { refreshInterval: 10000, revalidateOnFocus: false }
    );

    const { logs } = useMachineLogs(selectedMachine?.id || '', 10000);

    const checkLogHealth = () => {
        if (!logs || logs.length === 0) return null;

        // Get last viewed timestamp
        const lastViewedStr = localStorage.getItem('lastLogsViewed');
        const lastViewedTime = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

        const recentLogs = logs.slice(0, 10);

        // Filter for NEW logs only (newer than last viewed)
        const newError = recentLogs.find(l => {
            const logTime = new Date(l.timestamp).getTime();
            return logTime > lastViewedTime && (l.level.toLowerCase() === 'error' || l.level.toLowerCase() === 'fatal');
        });

        const newWarning = recentLogs.find(l => {
            const logTime = new Date(l.timestamp).getTime();
            return logTime > lastViewedTime && l.level.toLowerCase() === 'warning';
        });

        if (newError) return { type: 'error' as const, message: 'New Errors' };
        if (newWarning) return { type: 'warning' as const, message: 'New Warnings' };
        return null;
    };

    const logHealth = checkLogHealth();

    const uptime = status?.uptime || { currentStart: null };
    const machineStatus = selectedMachine?.connectionStatus ?? 'offline';
    const statusText = selectedMachine?.statusText;

    // Determine effective status for the badge (override if log issues)
    const effectiveStatus = (logHealth?.type || machineStatus) as any;

    // Last seen timestamp for "Offline for X" calculation
    const lastSeenTime = status?.lastPingTime || status?.lastActivityTime || selectedMachine?.lastSeen;

    const handleSystem = async (action: 'shutdown' | 'logout') => {
        if (!selectedMachine) return;
        if (!window.confirm(`Are you sure you want to ${action} this machine?`)) return;

        try {
            await VorsightApi.systemAction(action, selectedMachine.id);
            // Optional: Show toast or status update
        } catch (e) {
            console.error(`Failed to ${action}:`, e);
        }
    };

    return (
        <Card variant="glass" className="h-full flex flex-col">
            <CardContent className="p-4 space-y-4 flex-1">
                {/* Header: Machine Name & Status */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-sm sm:text-base font-semibold tracking-wide text-foreground uppercase">
                            SYSTEM STATUS
                        </h4>
                        {version && (
                            <p className="text-[10px] text-muted-foreground/70 font-mono">
                                v{version}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Service Status Row */}
                        <div className="flex items-center gap-3">
                            <LiveStatusText
                                status={machineStatus}
                                statusText={statusText}
                                timestamp={lastSeenTime}
                            />
                            {/* Heartbeat Progress (only if online/reachable) */}
                            {machineStatus !== 'offline' && (
                                <div className="flex-1 max-w-[100px] mt-0.5">
                                    <HeartbeatProgress
                                        lastSeen={lastSeenTime}
                                        intervalSeconds={(() => {
                                            if (!selectedMachine?.settings) return 10;
                                            try {
                                                const s = typeof selectedMachine.settings === 'string'
                                                    ? JSON.parse(selectedMachine.settings)
                                                    : selectedMachine.settings;
                                                return s.activity?.intervalSeconds || 10;
                                            } catch { return 10; }
                                        })()}
                                        className="h-0.5"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Log Health Row (if issues exist) */}
                        {logHealth && (
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background/40 border border-border/40">
                                {logHealth.type === 'error' ? (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                )}
                                <span className="text-xs font-medium flex-1">
                                    {logHealth.message}
                                </span>
                                <div
                                    onClick={onToggleLogs}
                                    className={cn(
                                        "text-xs font-semibold cursor-pointer underline decoration-dotted underline-offset-2 transition-colors",
                                        logHealth.type === 'error' ? "text-destructive hover:text-destructive/80" : "text-warning hover:text-warning/80"
                                    )}
                                >
                                    View
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ping / Reachability (if distinct from service status) */}
                    {selectedMachine?.pingStatus === 'reachable' && (
                        <div className="flex items-center gap-2 px-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 shadow-[0_0_4px_rgba(16,185,129,0.3)]" />
                            <span className="text-[10px] text-muted-foreground/80 font-mono tracking-tight">
                                MACHINE PINGABLE
                            </span>
                        </div>
                    )}
                </div>

                {/* Uptime Stats */}
                <div className="pt-2 border-t border-border/50">
                    <UptimeDisplay
                        currentStart={uptime.currentStart}
                        isDisabled={false}
                    />
                </div>
            </CardContent>

            {/* System Actions Footer */}
            <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-2">
                <button
                    onClick={() => handleSystem('logout')}
                    disabled={effectiveStatus === 'offline'}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium border border-warning/20 bg-warning/5 text-warning hover:bg-warning/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Log Out User"
                >
                    <LogOut size={14} />
                    <span>Log Out</span>
                </button>
                <button
                    onClick={() => handleSystem('shutdown')}
                    disabled={effectiveStatus === 'offline'}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Shutdown Machine"
                >
                    <Power size={14} />
                    <span>Shutdown</span>
                </button>
            </div>
        </Card >
    );
});
