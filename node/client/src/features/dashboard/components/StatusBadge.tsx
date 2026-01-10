import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, type LucideIcon } from 'lucide-react';

type ConnectionStatus = 'online' | 'unstable' | 'offline' | 'reachable';

interface LogHealth {
    type: 'warning' | 'error';
    message: string;
}

interface StatusBadgeProps {
    status: ConnectionStatus;
    statusText?: string;
    className?: string;
    logHealth?: LogHealth | null;
    onClick?: () => void;
}

interface StatusConfig {
    label: string;
    dotClass: string;
    textClass: string;
    showPulse: boolean;
    icon?: LucideIcon;
}

export function StatusBadge({ status, statusText, className, logHealth, onClick }: StatusBadgeProps) {
    let config: StatusConfig = getStatusConfig(status);

    // Override config if we have log health issues (and machine is otherwise reachable)
    if (logHealth && (status === 'online' || status === 'reachable')) {
        if (logHealth.type === 'error') {
            config = {
                label: 'ATTENTION',
                dotClass: 'bg-destructive',
                textClass: 'text-destructive border-destructive/50',
                showPulse: true,
                icon: AlertCircle
            };
        } else if (logHealth.type === 'warning') {
            config = {
                label: 'WARNING',
                dotClass: 'bg-warning',
                textClass: 'text-warning border-warning/50',
                showPulse: true,
                icon: AlertTriangle
            };
        }
    }

    const Icon = config.icon;

    return (
        <div
            className={cn(
                "flex items-center gap-2 transition-opacity",
                onClick && "cursor-pointer hover:opacity-80",
                className
            )}
            onClick={onClick}
        >
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
                    "text-xs font-mono border-current flex items-center gap-1",
                    config.textClass
                )}
            >
                {Icon && <Icon className="h-3 w-3" />}
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
                showPulse: true,
                icon: undefined
            };
        case 'unstable':
            return {
                label: 'UNSTABLE',
                dotClass: 'bg-warning',
                textClass: 'text-warning border-warning/50',
                showPulse: true,
                icon: undefined
            };
        case 'reachable':
            return {
                label: 'REACHABLE',
                dotClass: 'bg-warning',
                textClass: 'text-warning border-warning/50',
                showPulse: false,
                icon: undefined
            };
        case 'offline':
        default:
            return {
                label: 'OFFLINE',
                dotClass: 'bg-muted',
                textClass: 'text-muted-foreground border-muted',
                showPulse: false,
                icon: undefined
            };
    }
}
