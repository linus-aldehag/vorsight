import { useEffect, useState } from 'react';
import { VorsightApi, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Card } from '../../components/ui/card';
import { Clock, Sliders } from 'lucide-react';
import { Usage24HourChart } from './Usage24HourChart';
import { ConfigSection } from '@/components/common/ConfigSection';
import { AccessControlConfig } from './AccessControlConfig';
import { settingsEvents } from '../../lib/settingsEvents';

export function AccessControlPage() {
    const { selectedMachine } = useMachine();
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

    const getStartTime = (accessControl: AgentSettings['accessControl']): string => {
        if (accessControl.schedule && accessControl.schedule.length > 0) {
            return accessControl.schedule[0].startTime || '08:00';
        }
        return '08:00';
    };

    const getEndTime = (accessControl: AgentSettings['accessControl']): string => {
        if (accessControl.schedule && accessControl.schedule.length > 0) {
            return accessControl.schedule[0].endTime || '22:00';
        }
        return '22:00';
    };

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();
        }
    }, [selectedMachine]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        setLoading(true);
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);

            if (data.accessControl) {
                setStartTime(getStartTime(data.accessControl));
                setEndTime(getEndTime(data.accessControl));
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedAccessControl: AgentSettings['accessControl']) => {
        if (!selectedMachine || !settings) return;
        setSaving(true);
        try {
            const newSettings: AgentSettings = {
                ...settings,
                accessControl: updatedAccessControl
            };

            await VorsightApi.saveSettings(selectedMachine.id, newSettings);
            setSettings(newSettings);
            setStartTime(getStartTime(updatedAccessControl));
            setEndTime(getEndTime(updatedAccessControl));
            settingsEvents.emit();
        } catch (err) {
            console.error('Failed to save settings:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center text-muted-foreground animate-pulse p-10">Loading configuration...</div>;

    // Use current settings or defaults
    const accessControl = settings?.accessControl || {
        enabled: false,
        violationAction: 'logoff',
        schedule: []
    };

    return (
        <div className="space-y-6">

            {/* Configuration Section with Header */}
            {settings && (
                <ConfigSection
                    icon={<Sliders size={24} />}
                    title="Access Control Configuration"
                    badge={!accessControl.enabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                            Enforcement Disabled
                        </span>
                    )}
                >
                    <AccessControlConfig
                        settings={accessControl}
                        onSave={handleSave}
                        saving={saving}
                    />
                </ConfigSection>
            )}

            {/* 24-Hour Usage Visualization */}
            {selectedMachine && (
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-primary" />
                        24-Hour Activity Overview
                    </h3>
                    <Usage24HourChart
                        machineId={selectedMachine.id}
                        allowedStart={startTime}
                        allowedEnd={endTime}
                    />
                </Card>
            )}

            {/* Current Schedule Summary */}
            {accessControl && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Current Schedule</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${accessControl.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                            {accessControl.enabled ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    {/* Simplified display - in reality we might want to iterate days if they differ */}
                    <div className="font-mono text-lg">
                        {accessControl.schedule?.length > 0
                            ? (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-16 text-xs">
                                                {accessControl.scheduleMode === 'custom' ? 'Custom' : 'Every Day'}
                                            </span>
                                            <span>
                                                {accessControl.scheduleMode === 'simple' || accessControl.schedule.length === 1 ? (
                                                    // Simple mode or single enty
                                                    <>
                                                        <span className="text-foreground">{getStartTime(accessControl)}</span> - <span className="text-foreground">{getEndTime(accessControl)}</span>
                                                    </>
                                                ) : (
                                                    // Custom mode summary
                                                    <span className="text-sm">
                                                        {accessControl.schedule.length} active windows
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )
                            : <span className="text-muted-foreground italic">No restrictions set</span>
                        }
                    </div>
                    <div className="text-xs text-muted-foreground pt-1 border-t border-border/30 mt-2 flex items-center gap-2">
                        <span>Policy:</span>
                        <span className={accessControl.violationAction === 'shutdown' ? 'text-red-500 font-medium' : 'text-foreground'}>
                            {accessControl.violationAction === 'logoff' ? 'Force Logoff' : 'Shutdown System'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
