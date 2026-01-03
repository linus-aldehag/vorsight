import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { UptimeStatus } from '@/api/client';
import { useMachine } from '@/context/MachineContext';
import { StatusBadge } from './components/StatusBadge';
import { UptimeDisplay } from './components/UptimeDisplay';
import { useHealthStats } from './hooks/useHealthStats';

interface HealthStatsProps {
    uptime: UptimeStatus;
    version?: string | null;
}

export function HealthStats({ uptime, version }: HealthStatsProps) {
    const { selectedMachine } = useMachine();
    const { settings } = useHealthStats(selectedMachine?.id);

    const status = selectedMachine?.connectionStatus ?? 'offline';
    const statusText = selectedMachine?.statusText;

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
            <CardContent className="p-4 space-y-4">
                {/* Header: Machine Name & Status */}
                <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm sm:text-base font-semibold tracking-wide text-foreground uppercase truncate">
                                {selectedMachine?.name || 'No Machine'}
                            </h4>
                            {version && (
                                <p className="text-[10px] text-muted-foreground/70 font-mono">
                                    v{version}
                                </p>
                            )}
                        </div>
                        <StatusBadge status={status} statusText={statusText} className="shrink-0" />
                    </div>

                    {/* Mobile: Show status text below on small screens */}
                    {statusText && (
                        <p className="text-xs text-muted-foreground sm:hidden">
                            {statusText}
                        </p>
                    )}
                </div>

                {/* Feature Status Badges */}
                {settings && (
                    <div className="flex flex-wrap gap-2">
                        {settings.screenshotIntervalSeconds === 0 && (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                                Screenshots Disabled
                            </Badge>
                        )}
                        {settings.pingIntervalSeconds === 0 && (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                                Activity Disabled
                            </Badge>
                        )}
                    </div>
                )}

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
}
