import { Card, CardContent } from '@/components/ui/card';
import { Clock, Activity as ActivityIcon } from 'lucide-react';
import { SectionHeader } from '@/components/common/SectionHeader';

import { useSettings } from '@/context/SettingsContext';
import { useMachine } from '@/context/MachineContext';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { memo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { socketService } from '@/services/socket';

interface ActivityMonitorProps {
    isDisabled?: boolean;
}

export const ActivityMonitor = memo(function ActivityMonitor({ isDisabled }: ActivityMonitorProps) {
    const { formatTimestamp } = useSettings();
    const { selectedMachine } = useMachine();
    const [activity, setActivity] = useState<any>(null);

    // Initial fetch (polled less frequently)
    const fetcher = async (url: string) => {
        const res = await api.get(url);
        return res.data;
    };

    const { data: status } = useSWR(
        selectedMachine ? `/status/${selectedMachine.id}` : null,
        fetcher,
        {
            refreshInterval: 30000,
            revalidateOnFocus: false,
            onSuccess: (data) => {
                if (data?.activity) {
                    setActivity(data.activity);
                }
            }
        }
    );

    // Real-time subscription
    useEffect(() => {
        if (!selectedMachine) return;

        // Subscribe to machine room for updates
        socketService.emit('web:watch', selectedMachine.id);

        const handleUpdate = (data: any) => {
            setActivity((prev: any) => ({ ...prev, ...data }));
        };



        socketService.on('activity:update', handleUpdate);

        return () => {
            socketService.emit('web:unwatch', selectedMachine.id);
            socketService.off('activity:update', handleUpdate);
        };
    }, [selectedMachine]);

    // ActivitySnapshot has: activeWindowTitle, timeSinceLastInput, timestamp
    // The payload from server is: { timestamp, activeWindow, processName, duration, username }
    // We map it to display.

    // Fallback to SWR data if no real-time yet
    const displayActivity = activity || status?.activity;

    const windowTitle = displayActivity?.activeWindow || displayActivity?.activeWindowTitle || 'No activity';
    const timestamp = displayActivity?.timestamp
        ? formatTimestamp(displayActivity.timestamp, { includeSeconds: true })
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
                            <div className="text-xs text-muted-foreground">Since:</div>
                            <div className="text-sm font-mono mb-1.5">{timestamp}</div>
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
