import { Card, CardContent } from '../../components/ui/card';
import type { UptimeStatus } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { VorsightApi, type AgentSettings } from '../../api/client';

interface HealthStatsProps {
    uptime: UptimeStatus;
    version?: string | null;
}

export function HealthStats({ uptime, version }: HealthStatsProps) {
    const { selectedMachine } = useMachine();
    const [settings, setSettings] = useState<AgentSettings | null>(null);

    useEffect(() => {
        if (selectedMachine) {
            VorsightApi.getSettings(selectedMachine.id)
                .then(setSettings)
                .catch(console.error);
        }
    }, [selectedMachine]);

    const getLastSeenText = () => {
        if (!selectedMachine?.lastSeen) return 'Never';
        try {
            // Append 'Z' to treat SQLite timestamp as UTC
            return formatDistanceToNow(new Date(selectedMachine.lastSeen + 'Z'), { addSuffix: true });
        } catch {
            return 'Unknown';
        }
    };

    const status = selectedMachine?.connectionStatus ?? 'offline';

    const getStatusConfig = () => {
        switch (status) {
            case 'online':
                return {
                    color: 'success',
                    label: 'ONLINE',
                    message: 'Connected',
                    showPulse: true
                };
            case 'unstable':
                return {
                    color: 'warning',
                    label: 'UNSTABLE',
                    message: 'Reconnecting...',
                    showPulse: true
                };
            case 'offline':
            default:
                return {
                    color: 'muted',
                    label: 'OFFLINE',
                    message: `Last seen ${getLastSeenText()}`,
                    showPulse: false
                };
        }
    };

    const statusConfig = getStatusConfig();

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4 space-y-4">
                {/* Status Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                            {selectedMachine?.name || 'No Machine'}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {statusConfig.message}
                        </p>
                        {version && (
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">
                                v{version}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            {statusConfig.showPulse && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${statusConfig.color} opacity-75`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-3 w-3 bg-${statusConfig.color}`}></span>
                        </span>
                        <span className={`text-xs font-mono text-${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                </div>

                {/* Feature Status Badges */}
                {settings && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {settings.screenshotIntervalSeconds === 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                                Screenshots Disabled
                            </span>
                        )}
                        {settings.pingIntervalSeconds === 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                                Activity Disabled
                            </span>
                        )}
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-3 pt-2 border-t border-border/50">
                    {/* Uptime - greyed out when activity tracking disabled */}
                    <div className={`flex items-center gap-2 ${settings && settings.pingIntervalSeconds === 0 ? 'opacity-40' : ''}`}>
                        <Activity size={14} className="text-primary" />
                        <div>
                            <div className="text-xs text-muted-foreground">Uptime</div>
                            <div className="text-sm font-mono">
                                {uptime.currentStart ? formatDistanceToNow(new Date(uptime.currentStart + 'Z')) : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
