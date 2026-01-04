import { useState, useEffect } from 'react';
import { useAuditEvents } from '@/hooks/useAudit';
import { useMachine } from '@/context/MachineContext';
import { Shield, Settings2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AuditFilters } from './AuditFilters';
import { AuditTable } from './AuditTable';
import { VorsightApi, type AgentSettings } from '@/api/client';

function AuditConfigurationModal({ machineId, onClose }: { machineId: string, onClose: () => void }) {
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [enabled, setEnabled] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, [machineId]);

    const loadSettings = async () => {
        try {
            const data = await VorsightApi.getSettings(machineId);
            setSettings(data);
            // Default to true if undefined (legacy settings)
            setEnabled(data.isAuditEnabled !== false);
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        setError(null);

        try {
            const updatedSettings = {
                ...settings,
                isAuditEnabled: enabled
            };

            await VorsightApi.saveSettings(machineId, updatedSettings);
            onClose();
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={onClose}>
            <div className="w-full sm:w-[400px] md:w-[450px] lg:w-[500px] max-w-full h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <h3 className="text-lg font-semibold">Audit Monitoring</h3>
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                            <X size={16} />
                        </Button>
                    </div>

                    <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                        {error && (
                            <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                <AlertCircle size={12} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading settings...</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={setEnabled}
                                        />
                                        <div>
                                            <div className="text-sm font-medium">
                                                {enabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {enabled
                                                    ? 'Security event monitoring is active'
                                                    : 'Security event monitoring is paused'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-xs text-muted-foreground border-l-2 border-primary/20 pl-3">
                                    Audit logging tracks security-relevant events like failed logons, privilege escalations, and system modifications.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                        <Button variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || isLoading}>
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function AuditPage() {
    const { selectedMachine } = useMachine();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(50);
    const [statusFilter, setStatusFilter] = useState<'all' | 'acknowledged' | 'unacknowledged'>('all');
    const [eventTypeFilter, setEventTypeFilter] = useState<string[]>([]);
    const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
    const [isConfigOpen, setIsConfigOpen] = useState(false);

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
            {/* Header matching Activity/Screenshot pattern */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Shield size={24} className="text-primary" />
                    <h2 className="text-3xl font-bold tracking-tight">Audit Log</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfigOpen(true)}
                    className="gap-1.5 self-start sm:self-auto"
                >
                    <Settings2 size={16} />
                    Configure
                </Button>
            </div>

            {/* Configuration Modal */}
            {isConfigOpen && (
                <AuditConfigurationModal
                    machineId={selectedMachine.id}
                    onClose={() => setIsConfigOpen(false)}
                />
            )}

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
