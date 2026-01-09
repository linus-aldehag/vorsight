import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, RefreshCw } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useState } from 'react';
import type { AuditEvent } from '@/hooks/useAudit';

interface AuditTableProps {
    events: AuditEvent[];
    isLoading: boolean;
    isError: any;
    onRefresh: () => void;
    onAcknowledge: (eventId: number, acknowledge: boolean) => void;
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

export function AuditTable({
    events,
    isLoading,
    isError,
    onRefresh,
    onAcknowledge,
    currentPage,
    itemsPerPage,
    totalItems,
    onPageChange
}: AuditTableProps) {
    const { formatTimestamp } = useSettings();
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

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

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedEvents = events.slice(startIndex, endIndex);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Loading audit events...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardContent className="p-12">
                    <div className="text-center text-destructive">
                        <AlertTriangle size={24} className="mx-auto mb-2" />
                        <p>Failed to load audit events</p>
                        <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4">
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (events.length === 0) {
        return (
            <Card>
                <CardContent className="p-12">
                    <div className="text-center text-muted-foreground">
                        <p>No audit events found</p>
                        <p className="text-sm mt-2">Try adjusting your filters</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Event Cards */}
            <div className="space-y-3">
                {paginatedEvents.map(event => {
                    const isExpanded = expandedIds.has(event.id);

                    return (
                        <Card
                            key={event.id}
                            className={`border-border/50 transition-colors ${event.is_flagged ? 'border-l-4 border-l-destructive' : ''
                                }`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Icon/Indicator */}
                                    <div className="mt-1">
                                        {event.is_flagged ? (
                                            <Flag size={16} className="text-destructive fill-destructive" />
                                        ) : (
                                            <AlertTriangle size={16} className="text-muted-foreground" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                                <div className="font-semibold text-sm">
                                                    {event.event_type}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    User: {event.username} • Event ID: {event.event_id}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatTimestamp(event.timestamp, { includeDate: true, includeSeconds: true })}
                                                </span>
                                                {event.source_log_name && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {event.source_log_name}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        {/* Details */}
                                        {event.details && (
                                            <div
                                                className={`text-xs text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}
                                            >
                                                {event.details}
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 mt-3">
                                            {/* Expand/collapse button */}
                                            {event.details && event.details.length > 100 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleExpand(event.id)}
                                                    className="h-7 text-xs px-2"
                                                >
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                </Button>
                                            )}

                                            {/* Acknowledge toggle button */}
                                            {event.acknowledged ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onAcknowledge(event.id, false)}
                                                    className="h-7 text-xs px-2"
                                                >
                                                    ✓ Acknowledged
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => onAcknowledge(event.id, true)}
                                                    className="h-7 text-xs px-2"
                                                >
                                                    Acknowledge
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-{endIndex} of {totalItems} events
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                        >
                            Next
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
