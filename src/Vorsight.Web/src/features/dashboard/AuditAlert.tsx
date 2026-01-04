import { useRecentAuditEvents } from '@/hooks/useAudit';
import { useMachine } from '@/context/MachineContext';
import { AlertTriangle, ShieldAlert, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Helper to get authorization headers
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export function AuditAlert() {
    const { selectedMachine } = useMachine();
    const { auditEvents, isLoading, isError, mutate } = useRecentAuditEvents(selectedMachine?.id || '');
    const { formatTimestamp } = useSettings();
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const handleDismiss = async (id: number) => {
        try {
            const response = await fetch(`/api/audit/${id}/acknowledge`, {
                method: 'PATCH',
                headers: getAuthHeaders()
            });

            if (response.ok) {
                // Refresh the audit events list to remove the dismissed item
                mutate();
            }
        } catch (error) {
            console.error('Failed to dismiss audit event:', error);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

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
            <div className="px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldAlert className="h-5 w-5 opacity-50" />
                    <span className="text-sm">No security alerts</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                    {auditEvents.map((event) => {
                        const isExpanded = expandedIds.has(event.id);
                        return (
                            <div
                                key={event.id}
                                className="flex flex-col gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 transition-colors"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="font-medium text-sm text-destructive">
                                                {event.event_type}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatTimestamp(event.timestamp, { includeSeconds: true })}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0 hover:bg-destructive/20"
                                                    onClick={() => handleDismiss(event.id)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            User: {event.username} • Event ID: {event.event_id}
                                        </div>
                                        {event.details && (
                                            <>
                                                <div className={`text-xs text-muted-foreground mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                    {event.details}
                                                </div>
                                                {event.details.length > 100 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs mt-1 px-2 hover:bg-destructive/20"
                                                        onClick={() => toggleExpand(event.id)}
                                                    >
                                                        {isExpanded ? (
                                                            <>
                                                                <ChevronUp className="h-3 w-3 mr-1" />
                                                                Show less
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ChevronDown className="h-3 w-3 mr-1" />
                                                                Show more
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
