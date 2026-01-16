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
                    {/* Detailed Schedule Summary */}
                    <div className="font-mono text-sm space-y-1">
                        {accessControl.schedule?.length > 0 ? (
                            (() => {
                                // Helper to group days with identical times
                                const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
                                type DayOfWeek = typeof orderedDays[number];
                                const groups: { days: DayOfWeek[], start: string, end: string }[] = [];
                                const dayShortMap: Record<string, string> = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

                                // Create a map of day -> schedule
                                // Key needs to be compatible, let's cast key to string if needed or rely on 'as const'
                                const scheduleMap = new Map(accessControl.schedule.map(s => [s.dayOfWeek, s]));

                                orderedDays.forEach(day => {
                                    const sched = scheduleMap.get(day);
                                    if (!sched) return;

                                    const lastGroup = groups[groups.length - 1];
                                    if (lastGroup && lastGroup.start === sched.startTime && lastGroup.end === sched.endTime) {
                                        // Check if this day is consecutive to the last day in the group (based on orderedDays index)
                                        const lastDayIndex = orderedDays.indexOf(lastGroup.days[lastGroup.days.length - 1]);
                                        const currentDayIndex = orderedDays.indexOf(day);

                                        if (currentDayIndex === lastDayIndex + 1) {
                                            lastGroup.days.push(day);
                                        } else {
                                            // Not consecutive (e.g. Mon and Wed have same times), create new group or handle differently?
                                            // For simplest UI, we might just list them. Or we can group by time regardless of continuity.
                                            // Let's group by time regardless of continuity for compactness, but then the "Mon-Fri" label logic needs to be smart.
                                            // Actually, standard practice is usually consecutive grouping. Let's stick to consecutive grouping for "Mon-Fri" style ranges.
                                            // If "Mon" and "Wed" are same, they become separate entries "Mon: ..." "Wed: ...".
                                            // Let's try to append if identical time?
                                            // Let's keep it simple: if time matches last group, add to group.
                                            lastGroup.days.push(day);
                                        }
                                    } else {
                                        groups.push({ days: [day], start: sched.startTime, end: sched.endTime });
                                    }
                                });

                                return groups.map((g, i) => {
                                    // Format day label
                                    let label = "";
                                    if (g.days.length === 1) {
                                        label = dayShortMap[g.days[0]];
                                    } else if (g.days.length === 7) {
                                        label = "Every Day";
                                    } else {
                                        // Check for continuity to decide between "Mon-Fri" or "Mon, Wed"
                                        // Simple heuristic: if length > 2 and they are consecutive, use range.
                                        // We added them in order, so we just check indices.
                                        let isConsecutive = true;
                                        for (let k = 0; k < g.days.length - 1; k++) {
                                            if (orderedDays.indexOf(g.days[k + 1]) !== orderedDays.indexOf(g.days[k]) + 1) {
                                                isConsecutive = false;
                                                break;
                                            }
                                        }

                                        if (isConsecutive) {
                                            label = `${dayShortMap[g.days[0]]} - ${dayShortMap[g.days[g.days.length - 1]]}`;
                                        } else {
                                            label = g.days.map(d => dayShortMap[d]).join(', ');
                                        }
                                    }

                                    return (
                                        <div key={i} className="flex justify-between items-center text-muted-foreground/80 hover:text-foreground transition-colors">
                                            <span className="font-medium text-xs uppercase tracking-wide">{label}</span>
                                            <span className="text-foreground">{g.start} - {g.end}</span>
                                        </div>
                                    );
                                });
                            })()
                        ) : (
                            <span className="text-muted-foreground italic">No restrictions set</span>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border/30 mt-2 flex items-center justify-between">
                        <span>Violation Action:</span>
                        <span className={`font-medium ${accessControl.violationAction === 'shutdown' ? 'text-destructive' : 'text-primary'}`}>
                            {accessControl.violationAction === 'logoff' ? 'Force Logoff' : 'Shutdown System'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
