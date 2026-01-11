
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LogToolbarProps {
    totalEvents: number;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    filterLevel: string;
    onFilterChange: (level: string) => void;
    minimal?: boolean;
}

const levelLabels: Record<string, string> = {
    all: 'All Levels',
    information: 'Information',
    warning: 'Warning',
    error: 'Error'
};

export function LogToolbar({
    totalEvents,
    searchTerm,
    onSearchChange,
    filterLevel,
    onFilterChange,
    minimal = false
}: LogToolbarProps) {
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

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 bg-background/50 border-input/50 px-3 font-normal shrink-0"
                        >
                            <Filter className="h-3.5 w-3.5 opacity-70" />
                            <span className="hidden xs:inline-block">
                                {levelLabels[filterLevel] || 'Filter'}
                            </span>
                            {/* Mobile only icon? Or keep text? 'hidden xs:inline-block' implies hidden on tiny screens. 
                                Let's just always show text for clarity unless user complains about space.
                                Actually space is tight on mobile. Let's just switch label to shorter one?
                            */}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                        {Object.entries(levelLabels).map(([value, label]) => (
                            <DropdownMenuItem
                                key={value}
                                onClick={() => onFilterChange(value)}
                                className="justify-between"
                            >
                                {label}
                                {filterLevel === value && <Check className="h-4 w-4 ml-2 opacity-100" />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
    );
}
