import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface LogEntry {
    id: number;
    timestamp: string;
    level: string;
    message: string;
    exception?: string;
    sourceContext?: string;
}

interface MachineLogsProps {
    machineId: string;
}

export function MachineLogs({ machineId }: MachineLogsProps) {
    const { token } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!machineId || !token) return;

            try {
                // Fetch latest 100 logs
                const res = await fetch(`http://localhost:3000/api/logs/${machineId}?limit=100`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [machineId, token]);

    const getIcon = (level: string) => {
        switch (level.toLowerCase()) {
            case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'fatal': return <AlertCircle className="h-4 w-4 text-red-700" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card className="h-full border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    System Logs
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px] w-full rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className="w-[150px]">Source</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Loading logs...
                                    </TableCell>
                                </TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        No logs found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log) => (
                                    <TableRow key={log.id} className="text-xs">
                                        <TableCell className="font-mono text-muted-foreground">
                                            {format(new Date(log.timestamp), 'MMM dd HH:mm:ss')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {getIcon(log.level)}
                                                <span className={
                                                    log.level === 'Error' ? 'text-red-500 font-medium' :
                                                        log.level === 'Warning' ? 'text-amber-600' : ''
                                                }>{log.level}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-[400px]">
                                            <div className="break-words">{log.message}</div>
                                            {log.exception && (
                                                <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                                                    {log.exception}
                                                </pre>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground truncate" title={log.sourceContext}>
                                            {log.sourceContext?.split('.').pop()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
