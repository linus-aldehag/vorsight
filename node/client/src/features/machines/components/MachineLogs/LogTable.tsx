import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { format } from 'date-fns';
import type { LogEntry } from './types';
import { cn } from '@/lib/utils';
import { logRowVariants } from '@/components/ui/variants/log';

interface LogTableProps {
    logs: LogEntry[];
    loading: boolean;
}

export function LogTable({ logs, loading }: LogTableProps) {

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
        <ScrollArea className="h-full w-full">
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
                        {logs.map((log) => {
                            const level = log.level.toLowerCase() as any;
                            return (
                                <TableRow
                                    key={log.id}
                                    className={cn(
                                        logRowVariants({ level }),
                                        "border-b-[var(--glass-border)]"
                                    )}
                                >
                                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap py-2 text-xs">
                                        {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                                    </TableCell>
                                    <TableCell className="py-2">
                                        {getLevelBadge(log.level)}
                                    </TableCell>
                                    <TableCell className="py-2 max-w-[500px]">
                                        <div className="break-words font-medium text-foreground/90 text-sm">{log.message}</div>
                                        {log.exception && (
                                            <div className="mt-1.5 p-2 bg-black/5 dark:bg-black/30 rounded border border-border/50 overflow-x-auto">
                                                <pre className="text-[10px] font-mono text-red-400 leading-relaxed">
                                                    {log.exception}
                                                </pre>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground truncate text-right font-mono text-[10px] py-2 pr-6" title={log.sourceContext}>
                                        {log.sourceContext?.split('.').pop()}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-4">
                {logs.map((log) => (
                    <div key={log.id} className="bg-card/50 border border-border/50 rounded-lg overflow-hidden shadow-sm backdrop-blur-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 bg-muted/30 border-b border-border/50">
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
                                    <pre className="text-[10px] font-mono text-red-400">
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
                ))}
            </div>
        </ScrollArea>
    );
}
