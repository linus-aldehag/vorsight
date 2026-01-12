import { useEffect, useState } from 'react';
import { StatusBadge, type StatusValue } from '@/components/ui/status-badge';
import type { LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LiveStatusTextProps {
    status: StatusValue;
    statusText: string | undefined;
    icon?: LucideIcon;
    timestamp?: string | number | Date | null;
}

export function LiveStatusText({ status, statusText, icon, timestamp }: LiveStatusTextProps) {
    const [liveText, setLiveText] = useState(statusText);

    useEffect(() => {
        // If status is online, trust the passed text (usually "Online (0ms)")
        if (status === 'online') {
            setLiveText(statusText);
            return;
        }

        // If no timestamp, fallback to static text
        if (!timestamp) {
            setLiveText(statusText);
            return;
        }

        const statsDate = new Date(timestamp);

        // Update immediately
        updateTime();

        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);

        function updateTime() {
            setLiveText(`Offline for ${formatDistanceToNow(statsDate)}`);
        }
    }, [status, statusText, timestamp]);

    return (
        <StatusBadge
            status={status}
            statusText={liveText}
            icon={icon}
        />
    );
}
