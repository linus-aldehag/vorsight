import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { VorsightApi, type AgentSettings } from '@/api/client';
import { useMachine } from '@/context/MachineContext';
import { Eye, Activity, Shield, Sliders, Settings2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    configSummary?: string;
    onToggle: (enabled: boolean) => void;
    onConfigure: () => void;
    saving: boolean;
}

function FeatureCard({ icon, title, description, enabled, configSummary, onToggle, onConfigure, saving }: FeatureCardProps) {
    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <div className="text-primary mt-1">{icon}</div>
                    <div className="flex-1 space-y-3">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-semibold">{title}</h4>
                                <Badge
                                    variant={enabled ? "default" : "secondary"}
                                    className={cn(
                                        "text-xs",
                                        enabled && "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20"
                                    )}
                                >
                                    {enabled ? 'Enabled' : 'Disabled'}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{description}</p>
                            {enabled && configSummary && (
                                <p className="text-xs text-muted-foreground mt-1 font-mono">
                                    {configSummary}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={onToggle}
                                    disabled={saving}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {enabled ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onConfigure}
                                className="gap-1.5"
                            >
                                <Settings2 size={14} />
                                Configure
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function FeaturesPage() {
    const { selectedMachine } = useMachine();
    const navigate = useNavigate();
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // Track which feature is saving
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();
        }
    }, [selectedMachine?.id]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        setLoading(true);
        setError(null);
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load feature settings');
        } finally {
            setLoading(false);
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

    const handleActivityToggle = async (enabled: boolean) => {
        await updateFeature('Activity Tracking', {
            isActivityEnabled: enabled
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

    const navigateToFeature = (view: string) => {
        if (selectedMachine) {
            navigate(`/${selectedMachine.id}/${view}`);
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

    const screenshotsEnabled = settings.isScreenshotEnabled;
    const activityEnabled = settings.isActivityEnabled;
    const auditEnabled = settings.isAuditEnabled;
    const accessControlEnabled = settings.isAccessControlEnabled;

    const screenshotInterval = screenshotsEnabled
        ? Math.round(settings.screenshotIntervalSeconds / 60)
        : Math.round((settings.screenshotIntervalSecondsWhenEnabled || 300) / 60);

    const activityInterval = activityEnabled
        ? settings.pingIntervalSeconds
        : (settings.pingIntervalSecondsWhenEnabled || 30);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight">Features & Modules</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage monitoring features for {selectedMachine.name}
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
                <FeatureCard
                    icon={<Eye size={24} />}
                    title="Screenshot Capture"
                    description="Automatically capture screenshots at regular intervals"
                    enabled={screenshotsEnabled}
                    configSummary={`Capturing every ${screenshotInterval} minute${screenshotInterval !== 1 ? 's' : ''}`}
                    onToggle={handleScreenshotsToggle}
                    onConfigure={() => navigateToFeature('gallery')}
                    saving={saving === 'Screenshot Capture'}
                />

                <FeatureCard
                    icon={<Activity size={24} />}
                    title="Activity Tracking"
                    description="Monitor active applications and window titles"
                    enabled={activityEnabled}
                    configSummary={`Checking every ${activityInterval} second${activityInterval !== 1 ? 's' : ''}`}
                    onToggle={handleActivityToggle}
                    onConfigure={() => navigateToFeature('activity')}
                    saving={saving === 'Activity Tracking'}
                />

                <FeatureCard
                    icon={<Shield size={24} />}
                    title="Audit Logging"
                    description="Track security-relevant events and system modifications"
                    enabled={auditEnabled}
                    configSummary={auditEnabled ? 'Monitoring security events' : undefined}
                    onToggle={handleAuditToggle}
                    onConfigure={() => navigateToFeature('audit')}
                    saving={saving === 'Audit Logging'}
                />

                <FeatureCard
                    icon={<Sliders size={24} />}
                    title="Access Control"
                    description="Configure time-based access restrictions and schedules"
                    enabled={accessControlEnabled}
                    configSummary={accessControlEnabled ? 'Schedule-based monitoring' : undefined}
                    onToggle={handleAccessControlToggle}
                    onConfigure={() => navigateToFeature('control')}
                    saving={saving === 'Access Control'}
                />
            </div>

            <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                    Changes take effect immediately. Disabled features will be hidden from navigation.
                </p>
            </div>
        </div>
    );
}
