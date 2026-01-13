import { useEffect, useState } from 'react';
import { VorsightApi, type AccessSchedule, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { TimeInput } from '../../components/ui/time-input';
import { Card } from '../../components/ui/card';
import { Save, AlertCircle, Clock, Eye, Activity } from 'lucide-react';

export function ScheduleManager() {
    const { selectedMachine } = useMachine();
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [agentSettings, setAgentSettings] = useState<AgentSettings>({
        screenshots: { enabled: false, intervalSeconds: 300, filterDuplicates: true },
        monitoring: { enabled: true, pingIntervalSeconds: 30 },
        audit: { enabled: true, filters: { security: true, system: true, application: true } },
        activity: { enabled: false },
        accessControl: { enabled: false, violationAction: 'logoff', schedule: [] }
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Feature toggles
    const [screenshotEnabled, setScreenshotEnabled] = useState(true);
    const [activityTrackingEnabled, setActivityTrackingEnabled] = useState(true);


    useEffect(() => {
        if (selectedMachine) {
            loadData();
        }
    }, [selectedMachine]);

    const loadData = async () => {
        try {
            // Load schedule
            try {
                const scheduleData = await VorsightApi.getSchedule(selectedMachine?.id);
                setSchedule(scheduleData || createDefaultSchedule());
            } catch (err) {
                console.warn('No schedule found, using defaults', err);
                setSchedule(createDefaultSchedule());
            }

            // Load agent settings
            const settings = await VorsightApi.getSettings(selectedMachine?.id);
            setAgentSettings(settings);

            // Initialize toggles
            setScreenshotEnabled(settings.screenshots.intervalSeconds > 0);
            setActivityTrackingEnabled(settings.monitoring.pingIntervalSeconds > 0);
            setActivityTrackingEnabled(settings.monitoring.pingIntervalSeconds > 0);
        } catch (err) {
            console.error('Failed to load agent settings', err);
            setError('Failed to load agent settings. Using defaults.');
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
        violationAction: 'logoff',
        createdUtc: new Date().toISOString(),
        modifiedUtc: new Date().toISOString()
    });

    const handleSave = async () => {
        if (!schedule) return;
        setSaving(true);
        setError(null);
        try {
            if (!selectedMachine) {
                setError('No machine selected');
                return;
            }

            const updatedSchedule = { ...schedule, isActive: true };
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);

            const updatedSettings: AgentSettings = {
                ...agentSettings,
                screenshots: {
                    ...agentSettings.screenshots,
                    intervalSeconds: screenshotEnabled ? agentSettings.screenshots.intervalSeconds : 0,
                    enabled: screenshotEnabled
                },
                monitoring: {
                    ...agentSettings.monitoring,
                    pingIntervalSeconds: activityTrackingEnabled ? agentSettings.monitoring.pingIntervalSeconds : 0,
                    enabled: activityTrackingEnabled
                },
                audit: agentSettings.audit,
                activity: agentSettings.activity,
                accessControl: agentSettings.accessControl
            };
            await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
        } catch (err) {
            setError('Failed to save settings');
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
                <h3 className="text-2xl font-bold tracking-tight">System Configuration</h3>
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
                    {/* Screenshot Monitoring */}
                    {/* Screenshot Monitoring */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-col lg:flex-row overflow-hidden transition-all duration-300">
                        <div className="p-6 lg:pr-0 flex items-start">
                            <Switch checked={screenshotEnabled} onCheckedChange={setScreenshotEnabled} className="mt-1" />
                        </div>

                        <div className="w-full h-px lg:w-px lg:h-auto bg-white/10 lg:my-4 lg:mx-6 lg:self-stretch" />

                        <div className="flex-1 py-6 px-6 lg:pr-6 lg:pl-0">
                            <div className="space-y-1 mb-4">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Eye size={16} className="text-primary" />
                                    Screenshot Monitoring
                                </h3>
                                <p className="text-sm text-muted-foreground">Capture interval customization</p>
                            </div>

                            {screenshotEnabled && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Interval (minutes)</label>
                                        <Input
                                            type="number"
                                            value={Math.round(agentSettings.screenshots.intervalSeconds / 60)}
                                            onChange={(e) => setAgentSettings({
                                                ...agentSettings,
                                                screenshots: {
                                                    ...agentSettings.screenshots,
                                                    intervalSeconds: (parseInt(e.target.value) || 5) * 60
                                                }
                                            })}
                                            min={1}
                                            max={60}
                                            className="font-mono bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">Range: 1 - 60 minutes</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Activity Tracking */}
                    {/* Activity Tracking */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-col lg:flex-row overflow-hidden transition-all duration-300">
                        <div className="p-6 lg:pr-0 flex items-start">
                            <Switch checked={activityTrackingEnabled} onCheckedChange={setActivityTrackingEnabled} className="mt-1" />
                        </div>

                        <div className="w-full h-px lg:w-px lg:h-auto bg-white/10 lg:my-4 lg:mx-6 lg:self-stretch" />

                        <div className="flex-1 py-6 px-6 lg:pr-6 lg:pl-0">
                            <div className="space-y-1 mb-4">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Activity size={16} className="text-primary" />
                                    Activity Tracking
                                </h3>
                                <p className="text-sm text-muted-foreground">Heartbeat and window monitoring</p>
                            </div>

                            {activityTrackingEnabled && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Ping Interval (seconds)</label>
                                        <Input
                                            type="number"
                                            value={agentSettings.monitoring.pingIntervalSeconds}
                                            onChange={(e) => setAgentSettings({
                                                ...agentSettings,
                                                monitoring: {
                                                    ...agentSettings.monitoring,
                                                    pingIntervalSeconds: parseInt(e.target.value) || 30
                                                }
                                            })}
                                            min={5}
                                            max={300}
                                            className="font-mono bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">Range: 5 - 300 seconds</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Schedule Enforcement */}
                    {/* Access Control Configuration */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-col lg:flex-row overflow-hidden transition-all duration-300">
                        <div className="flex-1 py-6 px-6">
                            <div className="space-y-1 mb-4">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Clock size={16} className="text-primary" />
                                    Access Control
                                </h3>
                                <p className="text-sm text-muted-foreground">Time window enforcement</p>
                            </div>

                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Start Time</label>
                                        <TimeInput
                                            value={getStartTime(schedule)}
                                            onChange={updateStartTime}
                                            className="font-mono bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">End Time</label>
                                        <TimeInput
                                            value={getEndTime(schedule)}
                                            onChange={updateEndTime}
                                            className="font-mono bg-background/50"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground border-l-2 border-primary/20 pl-4">
                                    Outside of these hours, the system will enforce logout policies. Ensure critical services are excluded from OS-level enforcement if necessary.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
