import { Card, CardContent } from '@/components/ui/card';
import { useMachine } from '@/context/MachineContext';
import { Network } from 'lucide-react';
import { useHealthStats } from './hooks/useHealthStats';
import useSWR from 'swr';
import { memo } from 'react';
import { useMachineLogs } from '../machines/components/MachineLogs/useMachineLogs';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, LogOut, Power, CheckCircle2 } from 'lucide-react';
import { VorsightApi } from '@/api/client';
import { LiveStatusText } from './components/LiveStatusText';
import api from '@/lib/axios';


interface HealthStatsProps {
    version?: string | null;
    onToggleLogs: () => void;
}

export const HealthStats = memo(function HealthStats({ version, onToggleLogs }: HealthStatsProps) {
    const { selectedMachine } = useMachine();
    useHealthStats(selectedMachine?.id);

    const fetcher = async (url: string) => {
        const res = await api.get(url);
        return res.data;
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


    const machineStatus = selectedMachine?.connectionStatus ?? 'offline';
    const statusText = selectedMachine?.statusText;

    // Determine effective status for the badge (override if log issues)
    const effectiveStatus = (logHealth?.type || machineStatus) as any;

    // Last seen timestamp for "Offline for X" calculation
    const lastSeenTime = status?.lastPingTime || status?.lastActivityTime || selectedMachine?.lastSeen;

    const pingLatency = selectedMachine?.pingLatency;
    const ipAddress = selectedMachine?.ipAddress;
    const isPingable = selectedMachine?.pingStatus === 'reachable';

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
                                intervalSeconds={10}
                            />
                        </div>

                        {/* Log Health Row */}
                        <div className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors",
                            logHealth
                                ? "bg-background/40 border-border/40"
                                : "bg-muted/20 border-border/20"
                        )}>
                            {logHealth ? (
                                logHealth.type === 'error' ? (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                ) : (
                                    <AlertTriangle className="h-4 w-4 text-warning" />
                                )
                            ) : (
                                <CheckCircle2 className="h-4 w-4 text-muted-foreground/30" />
                            )}
                            <span className={cn(
                                "text-xs font-medium flex-1",
                                logHealth ? "text-foreground" : "text-muted-foreground/50"
                            )}>
                                {logHealth ? logHealth.message : "No active alerts"}
                            </span>
                            <div
                                onClick={onToggleLogs}
                                className={cn(
                                    "text-xs font-semibold cursor-pointer underline decoration-dotted underline-offset-2 transition-colors",
                                    logHealth
                                        ? (logHealth.type === 'error' ? "text-destructive hover:text-destructive/80" : "text-warning hover:text-warning/80")
                                        : "text-muted-foreground/50 hover:text-muted-foreground/80"
                                )}
                            >
                                View
                            </div>
                        </div>
                    </div>

                    {/* Ping / Reachability (Always Visible) */}
                    <div className="pt-3 mt-1 border-t border-border/40">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "flex items-center justify-center h-6 w-6 rounded-md border transition-colors",
                                    isPingable && machineStatus === 'offline'
                                        ? "bg-success/10 border-success/20"
                                        : (ipAddress ? "bg-muted/50 border-border/50" : "bg-muted/20 border-border/20")
                                )}>
                                    <Network size={13} className={cn(
                                        "transition-colors",
                                        isPingable && machineStatus === 'offline'
                                            ? "text-success"
                                            : (ipAddress ? "text-muted-foreground" : "text-muted-foreground/30")
                                    )} />
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn(
                                        "text-[10px] font-medium uppercase tracking-wider",
                                        ipAddress ? "text-muted-foreground/70" : "text-muted-foreground/30"
                                    )}>
                                        Ping Monitor
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={cn(
                                            "text-xs font-medium font-mono min-h-[1rem]",
                                            ipAddress
                                                ? (isPingable ? "text-foreground" : "text-muted-foreground")
                                                : "text-muted-foreground/30"
                                        )}>
                                            {ipAddress || 'No connection'}
                                        </span>
                                        {isPingable && machineStatus === 'offline' && (
                                            <span className="px-1 py-px rounded text-[10px] bg-success/10 text-success font-medium">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end">
                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider",
                                    pingLatency !== undefined ? "text-muted-foreground/70" : "text-muted-foreground/30"
                                )}>
                                    Latency
                                </div>
                                <span className={cn(
                                    "text-xs font-mono font-medium min-h-[1rem]",
                                    pingLatency !== undefined
                                        ? (pingLatency < 50 ? "text-success" : pingLatency < 150 ? "text-warning" : "text-destructive")
                                        : "text-muted-foreground/30"
                                )}>
                                    {pingLatency !== undefined ? `${pingLatency}ms` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
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
