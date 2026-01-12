import { useEffect, useState } from 'react';
import { VorsightApi, type AccessSchedule, type AgentSettings } from '../../api/client';
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
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

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

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();
            loadSchedule();
        }
    }, [selectedMachine]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const loadSchedule = async () => {
        try {
            const scheduleData = await VorsightApi.getSchedule(selectedMachine?.id);
            const loadedSchedule = scheduleData || createDefaultSchedule();
            setSchedule(loadedSchedule);

            const start = getStartTime(loadedSchedule);
            const end = getEndTime(loadedSchedule);
            setStartTime(start);
            setEndTime(end);
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
        violationAction: 'logoff',
        createdUtc: new Date().toISOString(),
        modifiedUtc: new Date().toISOString()
    });

    const handleScheduleSave = async (updatedSchedule: AccessSchedule) => {
        if (!selectedMachine) return;
        setSaving(true);
        try {
            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);
            setSchedule(updatedSchedule);
            setStartTime(getStartTime(updatedSchedule));
            setEndTime(getEndTime(updatedSchedule));
            settingsEvents.emit();
        } catch (err) {
            console.error('Failed to save schedule:', err);
        } finally {
            setSaving(false);
        }
    };



    if (loading) return <div className="text-center text-muted-foreground animate-pulse p-10">Loading configuration...</div>;

    return (
        <div className="space-y-6">


            {/* Configuration Section with Header */}
            {settings && schedule && (
                <ConfigSection
                    icon={<Sliders size={24} />}
                    title="Access Control Configuration"
                    badge={!settings.isAccessControlEnabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                            Enforcement Disabled
                        </span>
                    )}
                >
                    <AccessControlConfig
                        schedule={schedule}
                        onSave={handleScheduleSave}
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
            {schedule && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Current Schedule</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${schedule.isActive ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                            {schedule.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    {/* Simplified display - in reality we might want to iterate days if they differ */}
                    <div className="font-mono text-lg">
                        {schedule.allowedTimeWindows?.length > 0
                            ? (
                                <>
                                    <div className="flex flex-col gap-1">
                                        {/* Group by time for simpler display if possible, or just show range of first */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground w-16 text-xs">Mon-Sun</span>
                                            <span>
                                                <span className="text-foreground">{getStartTime(schedule)}</span> - <span className="text-foreground">{getEndTime(schedule)}</span>
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
                        <span className={schedule.violationAction === 'shutdown' ? 'text-red-500 font-medium' : 'text-foreground'}>
                            {schedule.violationAction === 'logoff' ? 'Force Logoff' : 'Shutdown System'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
