import { Badge } from '@/components/ui/badge';

interface ScreenshotFiltersProps {
    dateRangeFilter: '24h' | '7d' | '30d' | 'all';
    onDateRangeFilterChange: (range: '24h' | '7d' | '30d' | 'all') => void;
}

export function ScreenshotFilters({
    dateRangeFilter,
    onDateRangeFilterChange
}: ScreenshotFiltersProps) {
    return (
        <div className="flex items-center gap-4 flex-wrap p-3 border border-border/50 rounded-lg bg-card/30">
            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Period:</span>
                <div className="flex gap-1">
                    <Badge
                        variant={dateRangeFilter === '24h' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onDateRangeFilterChange('24h')}
                    >
                        24h
                    </Badge>
                    <Badge
                        variant={dateRangeFilter === '7d' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onDateRangeFilterChange('7d')}
                    >
                        7d
                    </Badge>
                    <Badge
                        variant={dateRangeFilter === '30d' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onDateRangeFilterChange('30d')}
                    >
                        30d
                    </Badge>
                    <Badge
                        variant={dateRangeFilter === 'all' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onDateRangeFilterChange('all')}
                    >
                        All
                    </Badge>
                </div>
            </div>
        </div>
    );
}
