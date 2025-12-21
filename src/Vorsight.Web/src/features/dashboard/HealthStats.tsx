import { Card, CardContent } from '../../components/ui/card';
import type { HealthReport } from '../../api/client';

interface HealthStatsProps {
    health: HealthReport;
}

export function HealthStats({ health: _health }: HealthStatsProps) {
    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase">System Status</h4>
                    <p className="text-xs text-muted-foreground mt-1">Monitoring Service Active</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                    </span>
                    <span className="text-xs font-mono text-success">ONLINE</span>
                </div>
            </CardContent>
        </Card>
    );
}
