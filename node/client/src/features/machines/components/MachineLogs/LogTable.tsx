import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

import type { LogEntry } from './types';
import { cn } from '@/lib/utils';
import { logRowVariants } from '@/components/ui/variants/log';
import { format } from 'date-fns';

interface LogTableProps {
    logs: LogEntry[];
    loading: boolean;
    lastViewedTimestamp?: number;
}

export function LogTable({ logs, loading, lastViewedTimestamp }: LogTableProps) {

    const getLevelBadge = (level: string) => {
        const normalizedLevel = level.toLowerCase();
        switch (normalizedLevel) {
            case 'fatal':
                return <Badge variant="destructive" className="bg-red-900/50 text-red-200 border-red-800 hover:bg-red-900/70">FATAL</Badge>;
            case 'error':
                return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">ERROR</Badge>;
            case 'warning':
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">WARN</Badge>;
            default:
                return <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20">INFO</Badge>;
        }
    };


    const scrollEndRef = React.useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = React.useState(true);
    const prevLogCountRef = React.useRef(logs.length);

    // Auto-scroll effect
    React.useEffect(() => {
        if (loading) return;

        // If generic new logs arrived (length increased)
        if (logs.length > prevLogCountRef.current) {
            if (shouldAutoScroll) {
                requestAnimationFrame(() => {
                    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                });
            }
        }
        prevLogCountRef.current = logs.length;
    }, [logs.length, shouldAutoScroll, loading]);

    // Initial scroll to bottom on mount/load
    React.useEffect(() => {
        if (!loading && logs.length > 0) {
            // Check if we have unread logs - if so, don't auto scroll to bottom, let user see the divider
            // Unless we are just opening it? 
            // Better UX: If filtered logs are small, just show them.
            // If we have "New Logs" line, we might want to scroll TO that line?
            // For now, sticky bottom is standard for log tails.
            requestAnimationFrame(() => {
                scrollEndRef.current?.scrollIntoView({ behavior: 'auto' });
            });
        }
    }, [loading]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        // If user scrolls up, disable auto-scroll
        // Threshold of 50px
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShouldAutoScroll(isAtBottom);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                <span>Loading system logs...</span>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground h-full opacity-60">
                <Info className="h-8 w-8 mb-2 opacity-50" />
                <span className="text-sm font-medium">No logs found</span>
                <span className="text-xs">No entries match your current filters</span>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full w-full" onScrollCapture={handleScroll}>
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <Table variant="glass">
                    <TableHeader className="bg-[var(--glass-bg)] backdrop-blur sticky top-0 z-10 border-b border-[var(--glass-border)]">
                        <TableRow className="hover:bg-transparent border-b-[var(--glass-border)]">
                            <TableHead className="w-[140px] text-xs font-medium">Timestamp</TableHead>
                            <TableHead className="w-[100px] text-xs font-medium">Level</TableHead>
                            <TableHead className="text-xs font-medium">Message</TableHead>
                            <TableHead className="w-[150px] text-xs font-medium text-right pr-6">Source</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.map((log, index) => {
                            const level = log.level.toLowerCase() as any;
                            const logTime = new Date(log.timestamp).getTime();
                            const isNew = lastViewedTimestamp && logTime > lastViewedTimestamp;

                            // Check if this is the FIRST new log (boundary)
                            const prevLog = logs[index + 1]; // Older log
                            const prevLogTime = prevLog ? new Date(prevLog.timestamp).getTime() : 0;
                            // Since we map in order (assuming logs are sorted DESCENDING, index+1 is OLDER)
                            // We want the separator BELOW the last "Old" log? 
                            // Or ABOVE the first "New" log?
                            // If logs are DESC (Newest at top):
                            // New Log A
                            // New Log B
                            // --- Divider ---
                            // Old Log C

                            // So if current log is New, and next log is Old (or doesn't exist/is older than timestamp)
                            const showSeparator = isNew && (!prevLog || (lastViewedTimestamp && prevLogTime <= lastViewedTimestamp));

                            return (
                                <React.Fragment key={log.id}>
                                    <TableRow
                                        className={cn(
                                            logRowVariants({ level }),
                                            "border-b-[var(--glass-border)]",
                                            isNew && "bg-blue-500/5 hover:bg-blue-500/10"
                                        )}
                                    >
                                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap py-2 text-xs">
                                            {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                                            {isNew && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="New Log" />}
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {getLevelBadge(log.level)}
                                        </TableCell>
                                        <TableCell className="py-2 max-w-[500px]">
                                            <div className="break-words font-medium text-foreground/90 text-sm">{log.message}</div>
                                            {log.exception && (
                                                <div className="mt-1.5 p-2 bg-black/5 dark:bg-black/30 rounded border border-border/50 overflow-x-auto">
                                                    <pre className="text-[10px] font-mono text-red-400 leading-relaxed whitespace-pre-wrap break-all">
                                                        {log.exception}
                                                    </pre>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground truncate text-right font-mono text-[10px] py-2 pr-6" title={log.sourceContext}>
                                            {log.sourceContext?.split('.').pop()}
                                        </TableCell>
                                    </TableRow>
                                    {showSeparator && (
                                        <TableRow className="bg-muted/10 hover:bg-muted/10">
                                            <TableCell colSpan={4} className="py-1 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="h-[1px] flex-1 bg-border/50"></div>
                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">New Logs Above</span>
                                                    <div className="h-[1px] flex-1 bg-border/50"></div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        <TableRow>
                            <TableCell colSpan={4} className="p-0 border-0">
                                <div ref={scrollEndRef} />
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2 p-2">
                {logs.map((log) => {
                    return (
                        <div key={log.id} className="bg-card/40 border border-border/60 rounded-lg overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="flex items-center justify-between p-2.5 bg-muted/20 border-b border-border/40">
                                <span className="font-mono text-xs text-muted-foreground">
                                    {format(new Date(log.timestamp), 'HH:mm:ss')}
                                </span>
                                {getLevelBadge(log.level)}
                            </div>

                            {/* Body */}
                            <div className="p-3 space-y-2">
                                <p className="text-sm font-medium text-foreground leading-relaxed break-words">
                                    {log.message}
                                </p>

                                {log.exception && (
                                    <div className="p-2 bg-black/5 dark:bg-black/30 rounded border border-border/50 mt-2 overflow-x-auto">
                                        <pre className="text-[10px] font-mono text-red-400 whitespace-pre-wrap break-all">
                                            {log.exception}
                                        </pre>
                                    </div>
                                )}

                                {log.sourceContext && (
                                    <div className="flex justify-end pt-1">
                                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground max-w-full truncate">
                                            {log.sourceContext.split('.').pop()}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={scrollEndRef} />
            </div>
        </ScrollArea>
    );
}
