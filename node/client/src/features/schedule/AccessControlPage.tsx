import { useEffect, useState } from 'react';
import { VorsightApi, type AccessSchedule, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Card } from '../../components/ui/card';
import { Clock, Sliders } from 'lucide-react';
import { Usage24HourChart } from './Usage24HourChart';
import { ConfigSection } from '@/components/common/ConfigSection';
import { AccessControlConfig } from './AccessControlConfig';

export function AccessControlPage() {
    const { selectedMachine } = useMachine();
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [schedule, setSchedule] = useState<AccessSchedule | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

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
            const { settingsEvents } = await import('../../lib/settingsEvents');
            settingsEvents.emit();
        } catch (err) {
            console.error('Failed to save schedule:', err);
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

    if (loading) return <div className="text-center text-muted-foreground animate-pulse p-10">Loading configuration...</div>;

    return (
        <div className="space-y-6">
            {/* Configuration Section with Header */}
            {settings && schedule && (
                <ConfigSection
                    icon={<Sliders size={24} />}
                    title="Access Control"
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
        </div>
    );
}
