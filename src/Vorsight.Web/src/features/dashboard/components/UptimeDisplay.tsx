import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface UptimeDisplayProps {
    currentStart: string | null;
    isDisabled?: boolean;
    className?: string;
}

export function UptimeDisplay({ currentStart, isDisabled, className }: UptimeDisplayProps) {
    const uptimeText = currentStart
        ? formatDistanceToNow(new Date(currentStart + 'Z'))
        : 'N/A';

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-md border border-border/50 bg-surface/30",
            isDisabled && "opacity-40",
            className
        )}>
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Uptime</div>
                <div className="text-sm font-mono truncate">{uptimeText}</div>
            </div>
        </div>
    );
}
