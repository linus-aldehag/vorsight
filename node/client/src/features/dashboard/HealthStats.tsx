import { Card, CardContent } from '@/components/ui/card';
import { useMachine } from '@/context/MachineContext';
import { StatusBadge } from './components/StatusBadge';
import { UptimeDisplay } from './components/UptimeDisplay';
import { useHealthStats } from './hooks/useHealthStats';
import useSWR from 'swr';
import { memo } from 'react';
import { useMachineLogs } from '../machines/components/MachineLogs/useMachineLogs';
import { cn } from '@/lib/utils';


interface HealthStatsProps {
    version?: string | null;
    onToggleLogs: () => void;
}

export const HealthStats = memo(function HealthStats({ version, onToggleLogs }: HealthStatsProps) {
    const { selectedMachine } = useMachine();
    const { settings } = useHealthStats(selectedMachine?.id);

    const fetcher = async (url: string) => {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
    };

    const { data: status } = useSWR(
        selectedMachine ? `/api/status/${selectedMachine.id}` : null,
        fetcher,
        { refreshInterval: 10000, revalidateOnFocus: false }
    );

    // Fetch recent logs to determining health status
    // Polling every 10s to match other stats
    // We only need the latest few to check for warnings/errors
    const { logs } = useMachineLogs(selectedMachine?.id || '', 10000);

    const checkLogHealth = () => {
        if (!logs || logs.length === 0) return null;

        // Check last 5 mins or last few logs
        const recentLogs = logs.slice(0, 5);
        const error = recentLogs.find(l => l.level.toLowerCase() === 'error' || l.level.toLowerCase() === 'fatal');
        const warning = recentLogs.find(l => l.level.toLowerCase() === 'warning');

        if (error) return { type: 'error' as const, message: 'Recent Errors' };
        if (warning) return { type: 'warning' as const, message: 'Recent Warnings' };
        return null;
    };

    const logHealth = checkLogHealth();

    const uptime = status?.uptime || { currentStart: null };
    const machineStatus = selectedMachine?.connectionStatus ?? 'offline';
    const statusText = selectedMachine?.statusText;

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <CardContent className="p-4 space-y-4">
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

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                            <StatusBadge
                                status={machineStatus}
                            />
                            {statusText && (
                                <p className="text-xs text-muted-foreground font-medium">
                                    {statusText}
                                </p>
                            )}
                        </div>

                        {/* Log Warnings/Errors Link */}
                        {logHealth && (
                            <div
                                onClick={onToggleLogs}
                                className={cn(
                                    "text-xs font-semibold cursor-pointer underline decoration-dotted underline-offset-2 flex items-center gap-1.5 w-fit transition-colors",
                                    logHealth.type === 'error' ? "text-destructive hover:text-destructive/80" : "text-warning hover:text-warning/80"
                                )}
                            >
                                <span className={cn(
                                    "h-1.5 w-1.5 rounded-full animate-pulse",
                                    logHealth.type === 'error' ? "bg-destructive" : "bg-warning"
                                )} />
                                {logHealth.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* Uptime Stats */}
                <div className="pt-2 border-t border-border/50">
                    <UptimeDisplay
                        currentStart={uptime.currentStart}
                        isDisabled={settings?.pingIntervalSeconds === 0}
                    />
                </div>
            </CardContent>
        </Card>
    );
});
