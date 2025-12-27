import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { ActivitySnapshot } from '../../api/client';

interface ActivityMonitorProps {
    activity: ActivitySnapshot | null;
}

export function ActivityMonitor({ activity }: ActivityMonitorProps) {
    if (!activity) return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">No activity data</div>
            </CardContent>
        </Card>
    );

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-wide text-foreground uppercase">Current Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <div className="text-xs uppercase font-bold text-muted-foreground mb-1">
                            Active Window
                        </div>
                        <div className="text-lg font-medium truncate" title={activity.activeWindowTitle}>
                            {activity.activeWindowTitle || 'IDLE / Desktop'}
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2 border-t border-white/5">
                        Last snapshot: {new Date(activity.timestamp).toLocaleString('sv-SE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
