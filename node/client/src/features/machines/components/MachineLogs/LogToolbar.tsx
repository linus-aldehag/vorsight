
import { cn } from '@/lib/utils';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { toolbarControlVariants } from '@/components/ui/variants/log';

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
                    className={cn(toolbarControlVariants({ variant: 'search' }))}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <select
                    className={cn(toolbarControlVariants())}
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
