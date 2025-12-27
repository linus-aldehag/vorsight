import { useState } from 'react';
import { useAuditEvents } from '@/hooks/useAudit';
import { useMachine } from '@/context/MachineContext';
import { Shield } from 'lucide-react';
import { AuditFilters } from './AuditFilters';
import { AuditTable } from './AuditTable';

export function AuditPage() {
    const { selectedMachine } = useMachine();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);
    const [statusFilter, setStatusFilter] = useState<'all' | 'acknowledged' | 'unacknowledged'>('all');
    const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
    const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

    const offset = (currentPage - 1) * itemsPerPage;
    const { auditEvents, isLoading, isError, mutate } = useAuditEvents(
        selectedMachine?.id || '',
        itemsPerPage,
        offset
    );

    // Helper to get authorization headers
    function getAuthHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    const handleAcknowledge = async (eventId: number, acknowledge: boolean) => {
        try {
            const response = await fetch(`/api/audit/${eventId}/acknowledge`, {
                method: 'PATCH',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ acknowledged: acknowledge })
            });

            if (response.ok) {
                mutate(); // Refresh audit events
            } else {
                console.error('Failed to update acknowledgment status');
            }
        } catch (error) {
            console.error('Failed to update acknowledgment:', error);
        }
    };

    // Get unique event types from data
    const eventTypes = Array.from(new Set(auditEvents.map(e => e.event_type))).sort();

    // Apply filters
    const filteredEvents = auditEvents.filter(event => {
        // Acknowledged status filter
        if (statusFilter === 'acknowledged' && !event.acknowledged) return false;
        if (statusFilter === 'unacknowledged' && event.acknowledged) return false;

        // Event type filter
        if (eventTypeFilter.length > 0 && !eventTypeFilter.includes(event.event_type)) return false;

        // Date range filter
        if (dateRangeFilter !== 'all') {
            const eventDate = new Date(event.timestamp);
            const now = new Date();
            const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);

            if (dateRangeFilter === '24h' && diffHours > 24) return false;
            if (dateRangeFilter === '7d' && diffHours > 24 * 7) return false;
            if (dateRangeFilter === '30d' && diffHours > 24 * 30) return false;
        }

        return true;
    });

    if (!selectedMachine) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Select a machine to view audit logs.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Simple header */}
            <div className="flex items-center gap-2">
                <Shield size={24} className="text-primary" />
                <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
            </div>

            {/* Filters */}
            <AuditFilters
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                eventTypeFilter={eventTypeFilter}
                onEventTypeFilterChange={setEventTypeFilter}
                dateRangeFilter={dateRangeFilter}
                onDateRangeFilterChange={setDateRangeFilter}
                availableEventTypes={eventTypes}
            />

            {/* Event Table */}
            <AuditTable
                events={filteredEvents}
                isLoading={isLoading}
                isError={isError}
                onRefresh={mutate}
                onAcknowledge={handleAcknowledge}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredEvents.length}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
