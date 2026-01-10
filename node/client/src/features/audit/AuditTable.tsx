import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, RefreshCw, ChevronDown, ChevronUp, CheckCircle, Info } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useState } from 'react';
import type { AuditEvent } from '@/hooks/useAudit';
import { cn } from '@/lib/utils';
import { logRowVariants } from '@/components/ui/variants/log';

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
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border rounded-lg bg-card/30">
                <RefreshCw size={16} className="animate-spin mb-2" />
                <span>Loading audit events...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-destructive border border-destructive/20 rounded-lg bg-destructive/5">
                <AlertTriangle size={24} className="mb-2" />
                <p>Failed to load audit events</p>
                <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4">
                    Try Again
                </Button>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border rounded-lg bg-card/30">
                <Info size={24} className="mb-2 opacity-50" />
                <p>No audit events found</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-b-border/50">
                            <TableHead className="w-[180px] text-xs font-medium">Timestamp</TableHead>
                            <TableHead className="w-[140px] text-xs font-medium">Type</TableHead>
                            <TableHead className="w-[150px] text-xs font-medium">User</TableHead>
                            <TableHead className="text-xs font-medium">Details</TableHead>
                            <TableHead className="w-[120px] text-xs font-medium text-right">Status</TableHead>
                            <TableHead className="w-[100px] text-xs font-medium text-right pr-4">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedEvents.map(event => {
                            const isExpanded = expandedIds.has(event.id);

                            // Map audit state to shared variants
                            // If flagged -> "flagged" variant (red border/bg)
                            // If acknowledged -> default (muted)
                            // If unacknowledged -> "warning" or "error" depending on severity? For now let's use "warning" style for unacked.
                            let variantLevel: "default" | "flagged" | "warning" = "default";

                            if (event.is_flagged) {
                                variantLevel = "flagged";
                            } else if (!event.acknowledged) {
                                variantLevel = "warning";
                            }

                            return (
                                <TableRow
                                    key={event.id}
                                    className={cn(
                                        logRowVariants({ level: variantLevel }),
                                        "group"
                                    )}
                                >
                                    {/* Timestamp */}
                                    <TableCell className="py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTimestamp(event.timestamp, { includeDate: true, includeSeconds: true })}
                                    </TableCell>

                                    {/* Type */}
                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-2">
                                            {event.is_flagged && (
                                                <Flag size={12} className="text-destructive fill-destructive" />
                                            )}
                                            <span className="font-medium text-xs">{event.event_type}</span>
                                        </div>
                                    </TableCell>

                                    {/* User */}
                                    <TableCell className="py-2 text-xs">
                                        <div className="flex flex-col">
                                            <span>{event.username}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">ID: {event.event_id}</span>
                                        </div>
                                    </TableCell>

                                    {/* Details */}
                                    <TableCell className="py-2 max-w-[400px]">
                                        <div className="text-xs">
                                            {/* Source Badge */}
                                            {event.source_log_name && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 mr-2 mb-1 inline-flex">
                                                    {event.source_log_name}
                                                </Badge>
                                            )}

                                            {/* Detail Content */}
                                            {event.details && (
                                                <div className="inline">
                                                    <span className={isExpanded ? '' : 'line-clamp-1 break-all'}>
                                                        {typeof event.details === 'object' ? JSON.stringify(event.details) : event.details}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Expand Button inside details cell */}
                                            {event.details && (typeof event.details === 'string' ? event.details : JSON.stringify(event.details)).length > 60 && (
                                                <button
                                                    onClick={() => toggleExpand(event.id)}
                                                    className="inline-flex items-center gap-0.5 text-[10px] text-primary/70 hover:text-primary ml-1 font-medium hover:underline focus:outline-none"
                                                >
                                                    {isExpanded ? (
                                                        <><ChevronUp size={10} /> Show less</>
                                                    ) : (
                                                        <><ChevronDown size={10} /> More</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell className="py-2 text-right">
                                        {event.acknowledged ? (
                                            <Badge variant="outline" className="text-[10px] bg-green-500/5 text-green-600 border-green-200">
                                                Ack
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] bg-amber-500/5 text-amber-600 border-amber-200 animate-pulse">
                                                New
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="py-2 text-right pr-4">
                                        {event.acknowledged ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onAcknowledge(event.id, false)}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                title="Mark as Unacknowledged"
                                            >
                                                <RefreshCw size={12} />
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onAcknowledge(event.id, true)}
                                                className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100/20"
                                                title="Acknowledge"
                                            >
                                                <CheckCircle size={14} />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                    <div className="text-xs text-muted-foreground">
                        Showing {startIndex + 1}-{endIndex} of {totalItems} events
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="h-7 text-xs"
                        >
                            <ChevronLeft size={14} className="mr-1" />
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="h-7 text-xs"
                        >
                            Next
                            <ChevronRight size={14} className="ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
