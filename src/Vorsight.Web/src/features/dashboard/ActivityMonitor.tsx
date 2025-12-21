import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
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

    // Creative Status Logic
    const getStatus = (title: string) => {
        const t = (title || '').toLowerCase();
        if (t.includes('code') || t.includes('studio') || t.includes('vim') || t.includes('jetbrains')) return { label: '👨‍💻 Coding', variant: 'default' as const, className: 'bg-primary text-primary-foreground' };
        if (t.includes('discord') || t.includes('spotify') || t.includes('music')) return { label: '🎵 Chilling', variant: 'secondary' as const, className: 'bg-purple-900 text-purple-100' };
        if (t.includes('chrome') || t.includes('firefox') || t.includes('edge') || t.includes('brave')) return { label: '🌐 Browsing', variant: 'secondary' as const, className: 'bg-blue-900 text-blue-100' };
        if (t.includes('game') || t.includes('steam') || t.includes('hero') || t.includes('league')) return { label: '🎮 Gaming', variant: 'secondary' as const, className: 'bg-green-900 text-green-100' };
        if (t.includes('chat') || t.includes('slack') || t.includes('teams')) return { label: '💬 Chatting', variant: 'secondary' as const, className: 'bg-indigo-900 text-indigo-100' };

        return { label: 'Working', variant: 'secondary' as const, className: 'bg-muted text-muted-foreground' };
    };

    const status = getStatus(activity.activeWindowTitle);

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold tracking-wide text-foreground uppercase">Current Activity</CardTitle>
                <Badge variant={status.variant} className={status.className}>{status.label}</Badge>
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
