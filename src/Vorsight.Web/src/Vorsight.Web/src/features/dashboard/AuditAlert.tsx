import { useRecentAuditEvents } from '@/hooks/useAudit';
import { useMachine } from '@/context/MachineContext';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export function AuditAlert() {
    const { selectedMachine } = useMachine();
    const { auditEvents, isLoading, isError } = useRecentAuditEvents(selectedMachine?.id || '');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-sm">Loading...</div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-full text-destructive">
                <div className="text-sm">Failed to load audit events</div>
            </div>
        );
    }

    if (!auditEvents || auditEvents.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center p-4">
                    <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">No security alerts</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                    {auditEvents.map((event) => (
                        <div
                            key={event.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 transition-colors"
                        >
                            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="font-medium text-sm text-destructive truncate">
                                        {event.event_type}
                                    </div>
                                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                                        {format(new Date(event.timestamp), 'HH:mm:ss')}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    User: {event.username}
                                </div>
                                {event.details && (
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {event.details}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
