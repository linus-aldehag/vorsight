import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { TimeInput } from '@/components/ui/time-input';
import { VorsightApi, type AgentSettings, type AccessSchedule } from '@/api/client';
import { useMachine } from '@/context/MachineContext';
import { Eye, Activity, Shield, Sliders, Loader2, AlertCircle, ChevronDown, ChevronUp, Settings2, CheckCircle2, Circle } from 'lucide-react';

interface ExpandableFeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    saving: boolean;
    children?: React.ReactNode;
}

function ExpandableFeatureCard({ icon, title, description, enabled, onToggle, saving, children }: ExpandableFeatureCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasConfig = !!children;

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
                {/* Header */}
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="text-primary">{icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{title}</h4>
                                {enabled ? (
                                    <CheckCircle2 size={16} className="text-green-500" />
                                ) : (
                                    <Circle size={16} className="text-muted-foreground" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Switch
                                checked={enabled}
                                onCheckedChange={onToggle}
                                disabled={saving}
                            />
                            {hasConfig && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="gap-1.5"
                                    disabled={!enabled}
                                    title={!enabled ? "Enable feature to configure" : isExpanded ? "Hide configuration" : "Show configuration"}
                                >
                                    <Settings2 size={14} />
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expandable Configuration */}
                {children && isExpanded && (
                    <div className="border-t border-border/50 p-6 pt-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                        {children}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function FeaturesPage() {
    const { selectedMachine } = useMachine();
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Local state for interval inputs
    const [screenshotInterval, setScreenshotInterval] = useState(5);
    const [activityInterval, setActivityInterval] = useState(30);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();
            loadSchedule();
        }
    }, [selectedMachine?.id]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        setLoading(true);
        setError(null);
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
            // Initialize local interval state
            setScreenshotInterval(Math.round(data.screenshotIntervalSeconds / 60));
            setActivityInterval(data.pingIntervalSeconds);
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load feature settings');
        } finally {
            setLoading(false);
        }
    };

    const loadSchedule = async () => {
        if (!selectedMachine) return;
        try {
            const data = await VorsightApi.getSchedule(selectedMachine.id);
            setSchedule(data);
            if (data?.allowedTimeWindows && data.allowedTimeWindows.length > 0) {
                setStartTime(data.allowedTimeWindows[0].startTime || '08:00');
                setEndTime(data.allowedTimeWindows[0].endTime || '22:00');
            }
        } catch (err) {
            console.warn('No schedule found, using defaults');
        }
    };

    const updateFeature = async (featureName: string, updatedSettings: Partial<AgentSettings>) => {
        if (!selectedMachine || !settings) return;

        setSaving(featureName);
        setError(null);

        try {
            const newSettings = { ...settings, ...updatedSettings };
            const response = await VorsightApi.saveSettings(selectedMachine.id, newSettings);
            setSettings(response);

            // Broadcast settings update to refresh navigation
            const { settingsEvents } = await import('@/lib/settingsEvents');
            settingsEvents.emit();
        } catch (err) {
            console.error(`Failed to update ${featureName}:`, err);
            setError(`Failed to update ${featureName}`);
        } finally {
            setSaving(null);
        }
    };

    const handleScreenshotsToggle = async (enabled: boolean) => {
        await updateFeature('Screenshot Capture', {
            isScreenshotEnabled: enabled
        });
    };

    const handleScreenshotIntervalSave = async () => {
        if (!settings) return;
        await updateFeature('Screenshot Capture', {
            screenshotIntervalSeconds: screenshotInterval * 60,
            screenshotIntervalSecondsWhenEnabled: screenshotInterval * 60
        });
    };

    const handleActivityToggle = async (enabled: boolean) => {
        await updateFeature('Activity Tracking', {
            isActivityEnabled: enabled
        });
    };

    const handleActivityIntervalSave = async () => {
        if (!settings) return;
        await updateFeature('Activity Tracking', {
            pingIntervalSeconds: activityInterval,
            pingIntervalSecondsWhenEnabled: activityInterval
        });
    };

    const handleAuditToggle = async (enabled: boolean) => {
        await updateFeature('Audit Logging', {
            isAuditEnabled: enabled
        });
    };

    const handleAccessControlToggle = async (enabled: boolean) => {
        await updateFeature('Access Control', {
            isAccessControlEnabled: enabled
        });
    };

    const handleScheduleSave = async () => {
        if (!selectedMachine || !schedule) return;

        setSaving('Access Control Schedule');
        setError(null);

        try {
            const updatedSchedule = {
                ...schedule,
                allowedTimeWindows: [{
                    dayOfWeek: 0,
                    startTime,
                    endTime
                }]
            };
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);
            setSchedule(updatedSchedule);
        } catch (err) {
            console.error('Failed to save schedule:', err);
            setError('Failed to save schedule');
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!selectedMachine || !settings) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Select a machine to manage features.
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight">Features & Modules</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enable features and configure settings for {selectedMachine.name}
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive border border-destructive/50 p-3 rounded-md flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <div className="space-y-4">
                {/* Screenshot Capture */}
                <ExpandableFeatureCard
                    icon={<Eye size={24} />}
                    title="Screenshot Capture"
                    description="Automatically capture screenshots at regular intervals"
                    enabled={settings.isScreenshotEnabled}
                    onToggle={handleScreenshotsToggle}
                    saving={saving === 'Screenshot Capture'}
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Capture Interval (minutes)</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={screenshotInterval}
                                    onChange={(e) => setScreenshotInterval(parseInt(e.target.value) || 1)}
                                    min={1}
                                    max={60}
                                    className="font-mono bg-background/50 max-w-[120px]"
                                />
                                <Button
                                    onClick={handleScreenshotIntervalSave}
                                    disabled={saving === 'Screenshot Capture'}
                                    size="sm"
                                >
                                    {saving === 'Screenshot Capture' ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Range: 1 - 60 minutes</p>
                        </div>
                    </div>
                </ExpandableFeatureCard>

                {/* Activity Tracking */}
                <ExpandableFeatureCard
                    icon={<Activity size={24} />}
                    title="Activity Tracking"
                    description="Monitor active applications and window titles"
                    enabled={settings.isActivityEnabled}
                    onToggle={handleActivityToggle}
                    saving={saving === 'Activity Tracking'}
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Heartbeat Interval (seconds)</label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={activityInterval}
                                    onChange={(e) => setActivityInterval(parseInt(e.target.value) || 5)}
                                    min={5}
                                    max={300}
                                    className="font-mono bg-background/50 max-w-[120px]"
                                />
                                <Button
                                    onClick={handleActivityIntervalSave}
                                    disabled={saving === 'Activity Tracking'}
                                    size="sm"
                                >
                                    {saving === 'Activity Tracking' ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Range: 5 - 300 seconds</p>
                        </div>
                    </div>
                </ExpandableFeatureCard>

                {/* Audit Logging */}
                <ExpandableFeatureCard
                    icon={<Shield size={24} />}
                    title="Audit Logging"
                    description="Track security events and system modifications"
                    enabled={settings.isAuditEnabled}
                    onToggle={handleAuditToggle}
                    saving={saving === 'Audit Logging'}
                >
                    <p className="text-sm text-muted-foreground">
                        Monitors user logons, policy changes, process events, and file access. No additional configuration required.
                    </p>
                </ExpandableFeatureCard>

                {/* Access Control */}
                <ExpandableFeatureCard
                    icon={<Sliders size={24} />}
                    title="Access Control"
                    description="Schedule-based monitoring with time windows"
                    enabled={settings.isAccessControlEnabled}
                    onToggle={handleAccessControlToggle}
                    saving={saving === 'Access Control'}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Time</label>
                                <TimeInput
                                    value={startTime}
                                    onChange={setStartTime}
                                    className="font-mono bg-background/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Time</label>
                                <TimeInput
                                    value={endTime}
                                    onChange={setEndTime}
                                    className="font-mono bg-background/50"
                                />
                            </div>
                        </div>
                        <Button
                            onClick={handleScheduleSave}
                            disabled={saving === 'Access Control Schedule'}
                            size="sm"
                        >
                            {saving === 'Access Control Schedule' ? 'Saving...' : 'Save Schedule'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Monitoring active during these hours. Outside this window, logout policies may be enforced.
                        </p>
                    </div>
                </ExpandableFeatureCard>
            </div>
        </div>
    );
}
