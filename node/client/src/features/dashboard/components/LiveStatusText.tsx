import { useEffect, useState } from 'react';
import { StatusBadge, type StatusValue } from '@/components/ui/status-badge';
import type { LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveStatusTextProps {
    status: StatusValue;
    statusText: string | undefined;
    icon?: LucideIcon;
    timestamp?: string | number | Date | null;
    intervalSeconds?: number;
}

export function LiveStatusText({ status, statusText, icon, timestamp, intervalSeconds = 10 }: LiveStatusTextProps) {
    const [liveText, setLiveText] = useState(statusText);
    const [freshness, setFreshness] = useState(1);

    useEffect(() => {
        if (!timestamp) {
            setLiveText(statusText);
            setFreshness(0);
            return;
        }

        const statsDate = new Date(timestamp);

        const updateState = () => {
            if (status === 'online') {
                setLiveText(statusText);
            } else {
                setLiveText(`Offline for ${formatDistanceToNow(statsDate)}`);
            }

            const now = new Date().getTime();
            const elapsedSeconds = (now - statsDate.getTime()) / 1000;
            // Linear fade: 1 -> 0 over intervalSeconds
            setFreshness(Math.max(0, 1 - (elapsedSeconds / intervalSeconds)));
        };

        updateState();

        const interval = setInterval(updateState, 100);
        return () => clearInterval(interval);
    }, [status, statusText, timestamp, intervalSeconds]);

    return (
        <StatusBadge
            status={status}
            statusText={liveText}
            icon={icon}
            pulseOpacity={status === 'online' ? freshness : undefined}
        />
    );
}
