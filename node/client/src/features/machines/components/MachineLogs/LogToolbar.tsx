import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LogFilterToggle } from './LogFilterToggle';



interface LogToolbarProps {
    totalEvents: number;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    filterLevels: string[];
    onFilterToggle: (level: string) => void;
    minimal?: boolean;
}

export function LogToolbar({
    totalEvents,
    searchTerm,
    onSearchChange,
    filterLevels,
    onFilterToggle,
    minimal = false
}: LogToolbarProps) {
    const isLevelActive = (level: string) => filterLevels.includes(level);

    return (
        <CardHeader className={cn(
            "px-4 py-3 border-b border-[var(--glass-border)] flex flex-col gap-3 space-y-0",
            !minimal && "sm:flex-row sm:items-center sm:justify-between"
        )}>
            <div className="flex items-center gap-3 justify-between sm:justify-start">
                {!minimal && <CardTitle className="text-base font-medium">System Logs</CardTitle>}
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 shrink-0">
                    {totalEvents} events
                </Badge>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                    <Input
                        type="text"
                        placeholder="Search logs..."
                        className="h-8 bg-background/50 border-input/50 focus-visible:ring-primary/30 w-full"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/50">
                    <LogFilterToggle
                        level="information"
                        isActive={isLevelActive('information')}
                        onToggle={() => onFilterToggle('information')}
                        label="Info"
                    />
                    <div className="w-[1px] h-4 bg-border/50 mx-0.5" />
                    <LogFilterToggle
                        level="warning"
                        isActive={isLevelActive('warning')}
                        onToggle={() => onFilterToggle('warning')}
                        label="Warn"
                    />
                    <div className="w-[1px] h-4 bg-border/50 mx-0.5" />
                    <LogFilterToggle
                        level="error"
                        isActive={isLevelActive('error')}
                        onToggle={() => onFilterToggle('error')}
                        label="Error"
                    />
                </div>
            </div>
        </CardHeader>
    );
}
