import { CardHeader, CardTitle } from '@/components/ui/card';

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
        <CardHeader className="px-4 py-3 border-b flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">System Logs</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {totalEvents} events
                </span>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    placeholder="Search logs..."
                    className="h-8 w-[200px] bg-background/50 border rounded text-xs px-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <select
                    className="h-8 bg-background/50 border rounded text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary/50"
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
