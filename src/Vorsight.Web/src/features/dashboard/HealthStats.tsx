import { Card, CardContent } from '../../components/ui/card';
import type { HealthReport, UptimeStatus } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { formatDistanceToNow } from 'date-fns';
import { Activity, Camera } from 'lucide-react';

interface HealthStatsProps {
    health: HealthReport;
    uptime: UptimeStatus;
}

export function HealthStats({ health, uptime }: HealthStatsProps) {
    const { selectedMachine } = useMachine();

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
    const screenshotSuccessRate = health.totalScreenshotsSuccessful + health.totalScreenshotsFailed > 0
        ? Math.round((health.totalScreenshotsSuccessful / (health.totalScreenshotsSuccessful + health.totalScreenshotsFailed)) * 100)
        : 100;

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

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    {/* Uptime */}
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-primary" />
                        <div>
                            <div className="text-xs text-muted-foreground">Uptime</div>
                            <div className="text-sm font-mono">
                                {uptime.currentStart ? formatDistanceToNow(new Date(uptime.currentStart + 'Z')) : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Screenshots */}
                    <div className="flex items-center gap-2">
                        <Camera size={14} className="text-primary" />
                        <div>
                            <div className="text-xs text-muted-foreground">Screenshots</div>
                            <div className="text-sm font-mono flex items-center gap-1">
                                {health.totalScreenshotsSuccessful}
                                <span className="text-xs text-success">({screenshotSuccessRate}%)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
