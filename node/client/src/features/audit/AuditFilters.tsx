import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface AuditFiltersProps {
    statusFilter: 'all' | 'acknowledged' | 'unacknowledged';
    onStatusFilterChange: (filter: 'all' | 'acknowledged' | 'unacknowledged') => void;
    eventTypeFilter: string[];
    onEventTypeFilterChange: (types: string[]) => void;
    dateRangeFilter: '24h' | '7d' | '30d' | 'all';
    onDateRangeFilterChange: (range: '24h' | '7d' | '30d' | 'all') => void;
    availableEventTypes: string[];
}

export function AuditFilters({
    statusFilter,
    onStatusFilterChange,
    eventTypeFilter,
    onEventTypeFilterChange,
    dateRangeFilter,
    onDateRangeFilterChange,
    availableEventTypes
}: AuditFiltersProps) {
    const toggleEventType = (type: string) => {
        if (eventTypeFilter.includes(type)) {
            onEventTypeFilterChange(eventTypeFilter.filter(t => t !== type));
        } else {
            onEventTypeFilterChange([...eventTypeFilter, type]);
        }
    };

    return (
        <div className="flex items-center gap-4 flex-wrap p-3 border border-border/50 rounded-lg bg-card/30">
            {/* Acknowledged Filter */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Status:</span>
                <div className="flex gap-1">
                    <Badge
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onStatusFilterChange('all')}
                    >
                        All
                    </Badge>
                    <Badge
                        variant={statusFilter === 'unacknowledged' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onStatusFilterChange('unacknowledged')}
                    >
                        Unacknowledged
                    </Badge>
                    <Badge
                        variant={statusFilter === 'acknowledged' ? 'default' : 'outline'}
                        className="cursor-pointer text-xs h-6"
                        onClick={() => onStatusFilterChange('acknowledged')}
                    >
                        Acknowledged
                    </Badge>
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border/50" />

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

            {/* Event Type Filter */}
            {availableEventTypes.length > 0 && (
                <>
                    <div className="w-px h-6 bg-border/50" />
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase">Types:</span>
                        <div className="flex gap-1 flex-wrap">
                            {availableEventTypes.map(type => (
                                <Badge
                                    key={type}
                                    variant={eventTypeFilter.includes(type) ? 'default' : 'outline'}
                                    className="cursor-pointer text-xs h-6"
                                    onClick={() => toggleEventType(type)}
                                >
                                    {type}
                                    {eventTypeFilter.includes(type) && (
                                        <X size={10} className="ml-1" />
                                    )}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
