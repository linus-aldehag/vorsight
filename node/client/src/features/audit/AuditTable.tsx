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
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border border-border/50 overflow-hidden">
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
                            let variantLevel: "default" | "flagged" | "warning" = "default";
                            if (event.is_flagged) variantLevel = "flagged";
                            else if (!event.acknowledged) variantLevel = "warning";

                            return (
                                <TableRow
                                    key={event.id}
                                    className={cn(logRowVariants({ level: variantLevel }), "group")}
                                >
                                    <TableCell className="py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">
                                        {formatTimestamp(event.timestamp, { includeDate: true, includeSeconds: true })}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        <div className="flex items-center gap-2">
                                            {event.is_flagged && <Flag size={12} className="text-destructive fill-destructive" />}
                                            <span className="font-medium text-xs">{event.event_type}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-xs">
                                        <div className="flex flex-col">
                                            <span>{event.username}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">ID: {event.event_id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 max-w-[400px]">
                                        <div className="text-xs">
                                            {event.source_log_name && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1 mr-2 mb-1 inline-flex">
                                                    {event.source_log_name}
                                                </Badge>
                                            )}
                                            {event.details && (
                                                <div className="inline">
                                                    <span className={isExpanded ? '' : 'line-clamp-1 break-all'}>
                                                        {typeof event.details === 'object' ? JSON.stringify(event.details) : event.details}
                                                    </span>
                                                </div>
                                            )}
                                            {event.details && (typeof event.details === 'string' ? event.details : JSON.stringify(event.details)).length > 60 && (
                                                <button
                                                    onClick={() => toggleExpand(event.id)}
                                                    className="inline-flex items-center gap-0.5 text-[10px] text-primary/70 hover:text-primary ml-1 font-medium hover:underline focus:outline-none"
                                                >
                                                    {isExpanded ? <><ChevronUp size={10} /> Less</> : <><ChevronDown size={10} /> More</>}
                                                </button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
                                        {event.acknowledged ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-green-500/10 text-green-500 ring-1 ring-green-500/20">
                                                Resolved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 animate-pulse">
                                                Attention
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-2 text-right pr-4">
                                        {event.acknowledged ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onAcknowledge(event.id, false)}
                                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                            >
                                                Undo
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onAcknowledge(event.id, true)}
                                                className="h-8 px-2 text-xs bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {paginatedEvents.map(event => {
                    return (
                        <div key={event.id} className="bg-card border border-border/50 rounded-lg overflow-hidden shadow-sm">
                            {/* Card Header: Time & Status */}
                            <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/50">
                                <span className="font-mono text-xs text-muted-foreground">
                                    {formatTimestamp(event.timestamp, { includeDate: true, includeSeconds: false })}
                                </span>
                                {event.acknowledged ? (
                                    <span className="text-[10px] font-medium text-green-500 flex items-center gap-1">
                                        <CheckCircle size={12} /> Resolved
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-medium text-amber-500 flex items-center gap-1 animate-pulse">
                                        <AlertTriangle size={12} /> Attention
                                    </span>
                                )}
                            </div>

                            {/* Card Body: Content */}
                            <div className="p-3 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        {event.is_flagged && <Flag size={14} className="text-destructive fill-destructive" />}
                                        <span className="font-semibold text-sm text-foreground">{event.event_type}</span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5 break-all max-w-[120px]">
                                        {event.username}
                                    </Badge>
                                </div>

                                <div className="text-sm text-muted-foreground bg-muted/20 p-2 rounded-md font-mono text-xs break-all">
                                    {typeof event.details === 'object' ? JSON.stringify(event.details) : event.details}
                                </div>
                            </div>

                            {/* Card Footer: Action */}
                            {!event.acknowledged ? (
                                <button
                                    onClick={() => onAcknowledge(event.id, true)}
                                    className="w-full p-3 text-center text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-t border-primary/20"
                                >
                                    Acknowledge Event
                                </button>
                            ) : (
                                <div className="flex justify-end p-2 border-t border-border/50">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onAcknowledge(event.id, false)}
                                        className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5"
                                    >
                                        <RefreshCw size={12} />
                                        Undo
                                    </Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-2">

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
