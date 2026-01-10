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

// Local helper component to encapsulate the "Filter Badge" style pattern
function FilterBadge({
    active,
    onClick,
    children,
    onClear
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    onClear?: () => void;
}) {
    return (
        <Badge
            variant={active ? 'default' : 'outline'}
            className="cursor-pointer text-xs h-6 transition-all hover:opacity-80"
            onClick={onClick}
        >
            {children}
            {active && onClear && (
                <div
                    role="button"
                    className="ml-1 hover:text-red-300"
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                >
                    <X size={10} />
                </div>
            )}
        </Badge>
    );
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
                    <FilterBadge active={statusFilter === 'all'} onClick={() => onStatusFilterChange('all')}>
                        All
                    </FilterBadge>
                    <FilterBadge active={statusFilter === 'unacknowledged'} onClick={() => onStatusFilterChange('unacknowledged')}>
                        Unacknowledged
                    </FilterBadge>
                    <FilterBadge active={statusFilter === 'acknowledged'} onClick={() => onStatusFilterChange('acknowledged')}>
                        Acknowledged
                    </FilterBadge>
                </div>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-border/50" />

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">Period:</span>
                <div className="flex gap-1">
                    <FilterBadge active={dateRangeFilter === '24h'} onClick={() => onDateRangeFilterChange('24h')}>24h</FilterBadge>
                    <FilterBadge active={dateRangeFilter === '7d'} onClick={() => onDateRangeFilterChange('7d')}>7d</FilterBadge>
                    <FilterBadge active={dateRangeFilter === '30d'} onClick={() => onDateRangeFilterChange('30d')}>30d</FilterBadge>
                    <FilterBadge active={dateRangeFilter === 'all'} onClick={() => onDateRangeFilterChange('all')}>All</FilterBadge>
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
                                <FilterBadge
                                    key={type}
                                    active={eventTypeFilter.includes(type)}
                                    onClick={() => toggleEventType(type)}
                                    onClear={eventTypeFilter.includes(type) ? () => toggleEventType(type) : undefined}
                                >
                                    {type}
                                </FilterBadge>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
