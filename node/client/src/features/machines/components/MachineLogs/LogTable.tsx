import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { format } from 'date-fns';
import type { LogEntry } from './types';

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

    return (
        <ScrollArea className="h-full w-full">
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
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground text-xs">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span>Loading system logs...</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : logs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <Info className="h-8 w-8" />
                                    <span className="text-sm font-medium">No logs found</span>
                                    <span className="text-xs">No entries match your current filters</span>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        logs.map((log) => (
                            <TableRow
                                key={log.id}
                                className="border-b-[var(--glass-border)] hover:bg-muted/10"
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
                        ))
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}
