import { useEffect, useState } from 'react';
import { VorsightApi, type AccessSchedule } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Clock, Settings2, AlertCircle, X } from 'lucide-react';

export function AccessControlPage() {
    const { selectedMachine } = useMachine();
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Current applied state
    const [scheduleEnforcementEnabled, setScheduleEnforcementEnabled] = useState(true);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

    // Temporary state for config panel
    const [tempEnabled, setTempEnabled] = useState(true);
    const [tempStartTime, setTempStartTime] = useState('08:00');
    const [tempEndTime, setTempEndTime] = useState('22:00');

    useEffect(() => {
        if (selectedMachine && !isConfigOpen) {
            loadSchedule();
        }
    }, [selectedMachine]);

    const loadSchedule = async () => {
        try {
            const scheduleData = await VorsightApi.getSchedule(selectedMachine?.id);
            const loadedSchedule = scheduleData || createDefaultSchedule();
            setSchedule(loadedSchedule);

            const enabled = loadedSchedule.isActive;
            const start = getStartTime(loadedSchedule);
            const end = getEndTime(loadedSchedule);

            setScheduleEnforcementEnabled(enabled);
            setStartTime(start);
            setEndTime(end);
            setTempEnabled(enabled);
            setTempStartTime(start);
            setTempEndTime(end);
        } catch (err) {
            console.warn('No schedule found, using defaults', err);
            setSchedule(createDefaultSchedule());
        } finally {
            setLoading(false);
        }
    };

    const createDefaultSchedule = (): AccessSchedule => ({
        scheduleId: '',
        childUsername: 'child',
        isActive: true,
        allowedTimeWindows: [],
        dailyTimeLimitMinutes: 120,
        weekendBonusMinutes: 60,
        createdUtc: new Date().toISOString(),
        modifiedUtc: new Date().toISOString()
    });

    const handleApply = async () => {
        if (!schedule || !selectedMachine) return;
        setSaving(true);
        setError(null);
        try {
            const updatedSchedule = {
                ...schedule,
                isActive: tempEnabled,
                allowedTimeWindows: [{
                    dayOfWeek: 0,
                    startTime: tempStartTime,
                    endTime: tempEndTime
                }]
            };
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);
            setSchedule(updatedSchedule);
            setScheduleEnforcementEnabled(tempEnabled);
            setStartTime(tempStartTime);
            setEndTime(tempEndTime);
            setIsConfigOpen(false);
        } catch (err) {
            setError('Failed to save access control settings');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setTempEnabled(scheduleEnforcementEnabled);
        setTempStartTime(startTime);
        setTempEndTime(endTime);
        setError(null);
        setIsConfigOpen(false);
    };

    const getStartTime = (sched: AccessSchedule): string => {
        if (sched.allowedTimeWindows && sched.allowedTimeWindows.length > 0) {
            return sched.allowedTimeWindows[0].startTime || '08:00';
        }
        return '08:00';
    };

    const getEndTime = (sched: AccessSchedule): string => {
        if (sched.allowedTimeWindows && sched.allowedTimeWindows.length > 0) {
            return sched.allowedTimeWindows[0].endTime || '22:00';
        }
        return '22:00';
    };

    if (loading) return <div className="text-center text-muted-foreground animate-pulse p-10">Loading configuration...</div>;

    return (
        <div className="space-y-6">
            {/* Header matching Activity/Screenshot pattern */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Clock size={24} className="text-primary" />
                    <h2 className="text-3xl font-bold tracking-tight">Access Control</h2>
                    {!scheduleEnforcementEnabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                            Enforcement Disabled
                        </span>
                    )}
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
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={handleCancel}>
                    <div className="w-full sm:w-[400px] md:w-[450px] lg:w-[500px] max-w-full h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col h-full">
                            {/* Modal header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h3 className="text-lg font-semibold">Time Window Enforcement</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={16} />
                                </Button>
                            </div>

                            {/* Modal content */}
                            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                                {error && (
                                    <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                        <AlertCircle size={12} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Enable/Disable Toggle */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                                        <Switch
                                            checked={tempEnabled}
                                            onCheckedChange={setTempEnabled}
                                        />
                                        <div>
                                            <div className="text-sm font-medium">
                                                {tempEnabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {tempEnabled ? 'Time restrictions are active' : 'Time restrictions are paused'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Time Window Settings */}
                                {tempEnabled && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Start Time</label>
                                            <Input
                                                type="time"
                                                value={tempStartTime}
                                                onChange={(e) => setTempStartTime(e.target.value)}
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">End Time</label>
                                            <Input
                                                type="time"
                                                value={tempEndTime}
                                                onChange={(e) => setTempEndTime(e.target.value)}
                                                className="font-mono"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground border-l-2 border-primary/20 pl-3">
                                            Outside of these hours, the system will enforce logout policies.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal footer */}
                            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    disabled={saving}
                                >
                                    {saving ? 'Applying...' : 'Apply'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Usage Statistics Card */}
            {selectedMachine && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-primary" />
                        Usage Statistics
                    </h3>
                    <UsageStats machineId={selectedMachine.id} />
                </Card>
            )}
        </div>
    );
}

// Separate component for usage stats to handle data fetching
function UsageStats({ machineId }: { machineId: string }) {
    const [uptime, setUptime] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsageData();
        const interval = setInterval(loadUsageData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [machineId]);

    const loadUsageData = async () => {
        try {
            const status = await VorsightApi.getStatus(machineId);
            setUptime(status.uptime);
        } catch (err) {
            console.error('Failed to load usage data', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (start: string | null): string => {
        if (!start) return 'N/A';
        const startTime = new Date(start + 'Z');
        const now = new Date();
        const diffMs = now.getTime() - startTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    if (loading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Loading statistics...</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Current Session</div>
                <div className="text-2xl font-mono font-semibold">{formatDuration(uptime?.currentStart)}</div>
            </div>
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="text-2xl font-semibold">{uptime?.isTracking ? '🟢 Active' : '⚫ Inactive'}</div>
            </div>
        </div>
    );
}
