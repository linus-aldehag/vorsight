import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LogToolbar } from './MachineLogs/LogToolbar';
import { LogTable } from './MachineLogs/LogTable';
import { useMachineLogs } from './MachineLogs/useMachineLogs';

interface MachineLogsProps {
    machineId: string;
}

export function MachineLogs({ machineId }: MachineLogsProps) {
    const { logs, loading } = useMachineLogs(machineId);
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLogs = logs.filter(log => {
        const matchesLevel = filterLevel === 'all' || log.level.toLowerCase() === filterLevel;
        const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.sourceContext?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesLevel && matchesSearch;
    });

    return (
        <Card className="h-[500px] flex flex-col border-0 shadow-none bg-transparent">
            <LogToolbar
                totalEvents={filteredLogs.length}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterLevel={filterLevel}
                onFilterChange={setFilterLevel}
            />
            <CardContent className="flex-1 p-0 overflow-hidden">
                <LogTable logs={filteredLogs} loading={loading} />
            </CardContent>
        </Card>
    );
}
