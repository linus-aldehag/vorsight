import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'online' | 'unstable' | 'offline' | 'reachable';

interface StatusBadgeProps {
    status: ConnectionStatus;
    statusText?: string;
    className?: string;
}

export function StatusBadge({ status, statusText, className }: StatusBadgeProps) {
    const config = getStatusConfig(status);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <span className="relative flex h-3 w-3 shrink-0">
                {config.showPulse && (
                    <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        config.dotClass
                    )} />
                )}
                <span className={cn(
                    "relative inline-flex rounded-full h-3 w-3",
                    config.dotClass
                )} />
            </span>
            <Badge
                variant="outline"
                className={cn(
                    "text-xs font-mono border-current",
                    config.textClass
                )}
            >
                {config.label}
            </Badge>
            {statusText && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                    {statusText}
                </span>
            )}
        </div>
    );
}

function getStatusConfig(status: ConnectionStatus) {
    switch (status) {
        case 'online':
            return {
                label: 'ONLINE',
                dotClass: 'bg-success',
                textClass: 'text-success border-success/50',
                showPulse: true
            };
        case 'unstable':
            return {
                label: 'UNSTABLE',
                dotClass: 'bg-warning',
                textClass: 'text-warning border-warning/50',
                showPulse: true
            };
        case 'reachable':
            return {
                label: 'REACHABLE',
                dotClass: 'bg-warning',
                textClass: 'text-warning border-warning/50',
                showPulse: false
            };
        case 'offline':
        default:
            return {
                label: 'OFFLINE',
                dotClass: 'bg-muted',
                textClass: 'text-muted-foreground border-muted',
                showPulse: false
            };
    }
}
