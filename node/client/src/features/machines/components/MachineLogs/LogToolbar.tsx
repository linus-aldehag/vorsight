
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface LogToolbarProps {
    totalEvents: number;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    filterLevel: string;
    onFilterChange: (level: string) => void;
}

export function LogToolbar({
    totalEvents,
    searchTerm,
    onSearchChange,
    filterLevel,
    onFilterChange
}: LogToolbarProps) {
    return (
        <CardHeader className="px-4 py-3 border-b border-[var(--glass-border)] flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
                <CardTitle className="text-base font-medium">System Logs</CardTitle>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    {totalEvents} events
                </Badge>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative w-64">
                    <Input
                        type="text"
                        placeholder="Search logs..."
                        className="h-8 bg-background/50 border-input/50 focus-visible:ring-primary/30"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <select
                    className="h-8 rounded-md border border-input/50 bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={filterLevel}
                    onChange={(e) => onFilterChange(e.target.value)}
                >
                    <option value="all">All Levels</option>
                    <option value="information">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                </select>
            </div>
        </CardHeader>
    );
}
