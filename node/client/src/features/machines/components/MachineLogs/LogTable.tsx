import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { LogEntry } from './types';

interface LogTableProps {
    logs: LogEntry[];
    loading: boolean;
}

export function LogTable({ logs, loading }: LogTableProps) {

    const getIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
            case 'fatal': return <AlertCircle className="h-3.5 w-3.5 text-red-700" />;
            case 'warning': return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
            default: return <Info className="h-3.5 w-3.5 text-blue-500" />;
        }
    };

    const getRowColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return 'bg-red-500/5 hover:bg-red-500/10';
            case 'fatal': return 'bg-red-500/10 hover:bg-red-500/20';
            case 'warning': return 'bg-amber-500/5 hover:bg-amber-500/10';
            default: return 'hover:bg-muted/50';
        }
    };

    return (
        <ScrollArea className="h-full w-full">
            <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-b-border/50">
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
                            <TableRow key={log.id} className={`text-xs border-b-border/40 transition-colors ${getRowColor(log.level)}`}>
                                <TableCell className="font-mono text-muted-foreground whitespace-nowrap py-2">
                                    {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                                </TableCell>
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-1.5">
                                        {getIcon(log.level)}
                                        <span className={
                                            log.level === 'Error' ? 'text-red-500 font-semibold' :
                                                log.level === 'Warning' ? 'text-amber-600 font-medium' :
                                                    'text-muted-foreground'
                                        }>{log.level}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-2 max-w-[500px]">
                                    <div className="break-words font-medium text-foreground/90">{log.message}</div>
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
