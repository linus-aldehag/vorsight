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
    // Default to Warning and Error only, or load from storage
    const [filterLevels, setFilterLevels] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('logFilterLevels');
            return saved ? JSON.parse(saved) : ['warning', 'error'];
        } catch {
            return ['warning', 'error'];
        }
    });
    const [searchTerm, setSearchTerm] = useState('');

    const handleFilterToggle = (level: string) => {
        setFilterLevels(prev => {
            const next = prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level];
            localStorage.setItem('logFilterLevels', JSON.stringify(next));
            return next;
        });
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.sourceContext?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLevel = filterLevels.includes(log.level.toLowerCase());
        return matchesSearch && matchesLevel;
    });

    return (
        <Card className={cn("flex flex-col border-0 shadow-none bg-transparent", className)}>
            <LogToolbar
                totalEvents={filteredLogs.length}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterLevels={filterLevels}
                onFilterToggle={handleFilterToggle}
                minimal={minimal}
            />
            <CardContent className="flex-1 p-0 overflow-hidden">
                <LogTable logs={filteredLogs} loading={loading} lastViewedTimestamp={lastViewedTimestamp} />
            </CardContent>
        </Card>
    );
}
