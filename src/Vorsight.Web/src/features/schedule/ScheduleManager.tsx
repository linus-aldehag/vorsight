import { useEffect, useState } from 'react';
import { VorsightApi, type AccessSchedule, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Save, AlertCircle, Clock, Eye, Activity, Palette, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ScheduleManager() {
    const { selectedMachine } = useMachine();
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [agentSettings, setAgentSettings] = useState<AgentSettings>({
        screenshotIntervalSeconds: 60,
        pingIntervalSeconds: 30,
        isMonitoringEnabled: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Feature toggles
    const [screenshotEnabled, setScreenshotEnabled] = useState(true);
    const [activityTrackingEnabled, setActivityTrackingEnabled] = useState(true);
    const [scheduleEnforcementEnabled, setScheduleEnforcementEnabled] = useState(true);

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
            setScreenshotEnabled(settings.screenshotIntervalSeconds > 0);
            setActivityTrackingEnabled(settings.pingIntervalSeconds > 0);
            setScheduleEnforcementEnabled(schedule?.isActive ?? true);
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

            const updatedSchedule = { ...schedule, isActive: scheduleEnforcementEnabled };
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);

            const updatedSettings = {
                ...agentSettings,
                screenshotIntervalSeconds: screenshotEnabled ? agentSettings.screenshotIntervalSeconds : 0,
                pingIntervalSeconds: activityTrackingEnabled ? agentSettings.pingIntervalSeconds : 0,
                isMonitoringEnabled: screenshotEnabled || activityTrackingEnabled
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
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-row overflow-hidden transition-all duration-300">
                        <div className="p-6 pr-0 flex items-start">
                            <Switch checked={screenshotEnabled} onCheckedChange={setScreenshotEnabled} className="mt-1" />
                        </div>

                        <div className="w-px bg-white/10 my-4 mx-6 self-stretch" />

                        <div className="flex-1 py-6 pr-6 pl-0">
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
                                        <label className="text-sm font-medium">Interval (seconds)</label>
                                        <Input
                                            type="number"
                                            value={agentSettings.screenshotIntervalSeconds}
                                            onChange={(e) => setAgentSettings({ ...agentSettings, screenshotIntervalSeconds: parseInt(e.target.value) || 60 })}
                                            min={10}
                                            max={600}
                                            className="font-mono bg-background/50"
                                        />
                                        <p className="text-xs text-muted-foreground">Range: 10 - 600 seconds</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Activity Tracking */}
                    {/* Activity Tracking */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-row overflow-hidden transition-all duration-300">
                        <div className="p-6 pr-0 flex items-start">
                            <Switch checked={activityTrackingEnabled} onCheckedChange={setActivityTrackingEnabled} className="mt-1" />
                        </div>

                        <div className="w-px bg-white/10 my-4 mx-6 self-stretch" />

                        <div className="flex-1 py-6 pr-6 pl-0">
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
                                            value={agentSettings.pingIntervalSeconds}
                                            onChange={(e) => setAgentSettings({ ...agentSettings, pingIntervalSeconds: parseInt(e.target.value) || 30 })}
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
                    {/* Schedule Enforcement */}
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm flex flex-row overflow-hidden transition-all duration-300">
                        <div className="p-6 pr-0 flex items-start">
                            <Switch checked={scheduleEnforcementEnabled} onCheckedChange={setScheduleEnforcementEnabled} className="mt-1" />
                        </div>

                        <div className="w-px bg-white/10 my-4 mx-6 self-stretch" />

                        <div className="flex-1 py-6 pr-6 pl-0">
                            <div className="space-y-1 mb-4">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Clock size={16} className="text-primary" />
                                    Access Control
                                </h3>
                                <p className="text-sm text-muted-foreground">Time window enforcement</p>
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
                </div>
            )}

            {/* Visual separator */}
            <div className="border-t border-white/10 my-8"></div>

            {/* Theme Selector - Independent Section */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                            <Palette size={16} className="text-primary" />
                            Theme
                        </h3>
                        <p className="text-sm text-muted-foreground">Choose your color scheme (applies immediately)</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {availableThemes
                            .sort((a, b) => a.displayName.localeCompare(b.displayName))
                            .map((theme) => {
                                const isActive = theme.name === currentTheme;

                                return (
                                    <button
                                        key={theme.name}
                                        onClick={() => setTheme(theme.name)}
                                        className={cn(
                                            "relative p-4 rounded border-2 transition-all duration-200 hover:scale-105",
                                            isActive
                                                ? "border-primary bg-primary/10"
                                                : "border-white/10 hover:border-white/20 bg-background/50"
                                        )}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex gap-1.5 mb-2">
                                                <div
                                                    className="w-full h-8 rounded border border-white/20"
                                                    style={{ backgroundColor: theme.colors.primary }}
                                                />
                                                <div
                                                    className="w-full h-8 rounded border border-white/20"
                                                    style={{ backgroundColor: theme.colors.background }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className={cn(
                                                    "text-sm font-medium",
                                                    isActive && "text-primary"
                                                )}>
                                                    {theme.displayName}
                                                </span>
                                                {isActive && (
                                                    <Check size={16} className="text-primary" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            </Card>
        </div>
    );
}
