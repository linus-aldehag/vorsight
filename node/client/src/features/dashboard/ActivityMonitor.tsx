import { Card, CardContent } from '@/components/ui/card';
import { Clock, Activity as ActivityIcon } from 'lucide-react';
import { SectionHeader } from '@/components/common/SectionHeader';
import { useSettings } from '@/context/SettingsContext';
import { useMachine } from '@/context/MachineContext';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import useSWR from 'swr';

interface ActivityMonitorProps {
    isDisabled?: boolean;
}

export const ActivityMonitor = memo(function ActivityMonitor({ isDisabled }: ActivityMonitorProps) {
    const { formatTimestamp } = useSettings();
    const { selectedMachine } = useMachine();

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

    const activity = status?.activity || null;
    // ActivitySnapshot has: activeWindowTitle, timeSinceLastInput, timestamp
    const windowTitle = activity?.activeWindowTitle || 'No activity';
    const timestamp = activity?.timestamp
        ? formatTimestamp(activity.timestamp, { includeSeconds: true })
        : 'Never';

    return (
        <Card variant="glass" className={cn("h-full", isDisabled && "opacity-60")}>
            <CardContent className="p-4 space-y-4">
                <SectionHeader title="Current Activity" className="px-0 pt-0 pb-0" />

                {/* Activity Info */}
                <div className="space-y-3">
                    {/* Active Window */}
                    <div className="flex items-start gap-3 p-3 rounded-md border border-[var(--glass-border)] bg-surface/30">
                        <ActivityIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">Window</div>
                            <div className="text-sm font-mono truncate" title={windowTitle}>
                                {windowTitle}
                            </div>
                        </div>
                    </div>

                    {/* Last Snapshot Time */}
                    <div className="flex items-start gap-3 p-3 rounded-md border border-[var(--glass-border)] bg-surface/30">
                        <Clock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground">Last Snapshot</div>
                            <div className="text-sm font-mono">{timestamp}</div>
                        </div>
                    </div>
                </div>

                {isDisabled && (
                    <div className="pt-2 border-t border-[var(--glass-border)]">
                        <p className="text-xs text-warning text-center">
                            Activity tracking disabled
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
