import { useEffect, useState } from 'react';
import { VorsightApi, type AccessSchedule } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Save, AlertCircle, Clock } from 'lucide-react';

export function AccessControlPage() {
    const { selectedMachine } = useMachine();
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scheduleEnforcementEnabled, setScheduleEnforcementEnabled] = useState(true);

    useEffect(() => {
        if (selectedMachine) {
            loadSchedule();
        }
    }, [selectedMachine]);

    const loadSchedule = async () => {
        try {
            const scheduleData = await VorsightApi.getSchedule(selectedMachine?.id);
            const loadedSchedule = scheduleData || createDefaultSchedule();
            setSchedule(loadedSchedule);
            setScheduleEnforcementEnabled(loadedSchedule.isActive);
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

    const handleSave = async () => {
        if (!schedule || !selectedMachine) return;
        setSaving(true);
        setError(null);
        try {
            const updatedSchedule = { ...schedule, isActive: scheduleEnforcementEnabled };
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);
        } catch (err) {
            setError('Failed to save access control settings');
        } finally {
            setSaving(false);
        }
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

    const updateStartTime = (time: string) => {
        if (!schedule) return;
        const endTime = getEndTime(schedule);
        setSchedule({
            ...schedule,
            allowedTimeWindows: [{
                dayOfWeek: 0,
                startTime: time,
                endTime: endTime
            }]
        });
    };

    const updateEndTime = (time: string) => {
        if (!schedule) return;
        const startTime = getStartTime(schedule);
        setSchedule({
            ...schedule,
            allowedTimeWindows: [{
                dayOfWeek: 0,
                startTime: startTime,
                endTime: time
            }]
        });
    };

    if (loading) return <div className="text-center text-muted-foreground animate-pulse p-10">Loading configuration...</div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold tracking-tight">Access Control</h3>
                <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive border border-destructive/50 p-4 rounded-md flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {schedule && (
                <div className="space-y-6">
                    {/* Access Control */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-row overflow-hidden transition-all duration-300">
                        <div className="p-6 pr-0 flex items-start">
                            <Switch checked={scheduleEnforcementEnabled} onCheckedChange={setScheduleEnforcementEnabled} className="mt-1" />
                        </div>

                        <div className="w-px bg-white/10 my-4 mx-6 self-stretch" />

                        <div className="flex-1 py-6 pr-6 pl-0">
                            <div className="space-y-1 mb-4">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Clock size={16} className="text-primary" />
                                    Time Window Enforcement
                                </h3>
                                <p className="text-sm text-muted-foreground">Restrict access to specified hours</p>
                            </div>

                            {scheduleEnforcementEnabled && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Start Time (24h)</label>
                                            <Input
                                                value={getStartTime(schedule)}
                                                onChange={(e) => updateStartTime(e.target.value)}
                                                placeholder="08:00"
                                                className="font-mono bg-background/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">End Time (24h)</label>
                                            <Input
                                                value={getEndTime(schedule)}
                                                onChange={(e) => updateEndTime(e.target.value)}
                                                placeholder="22:00"
                                                className="font-mono bg-background/50"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground border-l-2 border-primary/20 pl-4">
                                        Outside of these hours, the system will enforce logout policies. Ensure critical services are excluded from OS-level enforcement if necessary.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* TODO: Add usage statistics here */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
                        <h3 className="font-semibold mb-4">Usage Statistics</h3>
                        <p className="text-sm text-muted-foreground">Coming soon: Hours powered on, daily usage trends, etc.</p>
                    </Card>
                </div>
            )}
        </div>
    );
}
