import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LogToolbar } from './MachineLogs/LogToolbar';
import { LogTable } from './MachineLogs/LogTable';
import { useMachineLogs } from './MachineLogs/useMachineLogs';
import { cn } from '@/lib/utils';

interface MachineLogsProps {
    machineId: string;
    className?: string; // Allow overriding height/style
    minimal?: boolean;
    lastViewedTimestamp?: number;
}

export function MachineLogs({ machineId, className, minimal = false, lastViewedTimestamp }: MachineLogsProps) {
    const { logs, loading } = useMachineLogs(machineId);
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.sourceContext?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = filterLevel === 'all' || log.level.toLowerCase() === filterLevel;
        return matchesSearch && matchesLevel;
    });

    return (
        <Card className={cn("flex flex-col border-0 shadow-none bg-transparent", className)}>
            <LogToolbar
                totalEvents={filteredLogs.length}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterLevel={filterLevel}
                onFilterChange={setFilterLevel}
                minimal={minimal}
            />
            <CardContent className="flex-1 p-0 overflow-hidden">
                <LogTable logs={filteredLogs} loading={loading} lastViewedTimestamp={lastViewedTimestamp} />
            </CardContent>
        </Card>
    );
}
