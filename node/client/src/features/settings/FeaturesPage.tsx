import { useState, useEffect } from 'react';
import { VorsightApi, type AgentSettings, type AccessSchedule } from '@/api/client';
import { useMachine } from '@/context/MachineContext';
import { Eye, Activity, Shield, Sliders, Loader2, AlertCircle } from 'lucide-react';
import { ExpandableFeatureCard } from '@/components/common/ExpandableFeatureCard';
import { ScreenshotConfig } from '@/features/gallery/ScreenshotConfig';
import { ActivityConfig } from '@/features/activity/ActivityConfig';
import { AuditConfig } from '@/features/audit/AuditConfig';
import { AccessControlConfig } from '@/features/schedule/AccessControlConfig';
import { settingsEvents } from '@/lib/settingsEvents';

export function FeaturesPage() {
    const { selectedMachine } = useMachine();
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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

    const handleScreenshotSave = async (updates: Partial<AgentSettings>) => {
        await updateFeature('Screenshot Capture', updates);
    };

    const handleActivityToggle = async (enabled: boolean) => {
        await updateFeature('Activity Tracking', {
            isActivityEnabled: enabled
        });
    };

    const handleActivitySave = async (updates: Partial<AgentSettings>) => {
        await updateFeature('Activity Tracking', updates);
    };

    const handleAuditToggle = async (enabled: boolean) => {
        await updateFeature('Audit Logging', {
            isAuditEnabled: enabled
        });
    };

    const handleAuditSave = async (updates: Partial<AgentSettings>) => {
        await updateFeature('Audit Logging', updates);
    };

    const handleAccessControlToggle = async (enabled: boolean) => {
        await updateFeature('Access Control', {
            isAccessControlEnabled: enabled
        });
    };

    const handleScheduleSave = async (updatedSchedule: AccessSchedule) => {
        if (!selectedMachine) return;

        setSaving('Access Control Schedule');
        setError(null);

        try {
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
                {/* Screenshot Capture */}
                <ExpandableFeatureCard
                    icon={<Eye size={24} />}
                    title="Screenshot Capture"
                    description="Automatically capture screenshots at regular intervals"
                    enabled={!!settings.isScreenshotEnabled}
                    onToggle={handleScreenshotsToggle}
                    saving={saving === 'Screenshot Capture'}
                >
                    <ScreenshotConfig
                        settings={settings}
                        onSave={handleScreenshotSave}
                        saving={saving === 'Screenshot Capture'}
                    />
                </ExpandableFeatureCard>

                {/* Activity Tracking */}
                <ExpandableFeatureCard
                    icon={<Activity size={24} />}
                    title="Activity Tracking"
                    description="Monitor active applications and window titles"
                    enabled={!!settings.isActivityEnabled}
                    onToggle={handleActivityToggle}
                    saving={saving === 'Activity Tracking'}
                >
                    <ActivityConfig
                        settings={settings}
                        onSave={handleActivitySave}
                        saving={saving === 'Activity Tracking'}
                    />
                </ExpandableFeatureCard>

                {/* Audit Logging */}
                <ExpandableFeatureCard
                    icon={<Shield size={24} />}
                    title="Audit Logging"
                    description="Track security events and system modifications"
                    enabled={!!settings.isAuditEnabled}
                    onToggle={handleAuditToggle}
                    saving={saving === 'Audit Logging'}
                >
                    <AuditConfig
                        settings={settings}
                        onUpdate={handleAuditSave}
                    />
                </ExpandableFeatureCard>

                {/* Access Control */}
                <ExpandableFeatureCard
                    icon={<Sliders size={24} />}
                    title="Access Control"
                    description="Schedule-based monitoring with time windows"
                    enabled={!!settings.isAccessControlEnabled}
                    onToggle={handleAccessControlToggle}
                    saving={saving === 'Access Control'}
                >
                    <AccessControlConfig
                        schedule={schedule}
                        onSave={handleScheduleSave}
                        saving={saving === 'Access Control Schedule'}
                    />
                </ExpandableFeatureCard>
            </div>
        </div>
    );
}
