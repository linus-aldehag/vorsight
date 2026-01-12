import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/ui/time-input';
import type { AccessSchedule } from '@/api/client';

interface AccessControlConfigProps {
    schedule: AccessSchedule | null;
    onSave: (schedule: AccessSchedule) => Promise<void>;
    saving: boolean;
}

export function AccessControlConfig({ schedule, onSave, saving }: AccessControlConfigProps) {
    const [startTime, setStartTime] = useState(
        schedule?.allowedTimeWindows?.[0]?.startTime || '08:00'
    );
    const [endTime, setEndTime] = useState(
        schedule?.allowedTimeWindows?.[0]?.endTime || '22:00'
    );
    const [violationAction, setViolationAction] = useState<'logoff' | 'shutdown'>(
        schedule?.violationAction || 'logoff'
    );

    const handleSave = async () => {
        if (!schedule) return;

        // Apply same time window to all days (Mon-Sun) for simplicity as requested
        const days = [0, 1, 2, 3, 4, 5, 6];

        const updatedSchedule: AccessSchedule = {
            ...schedule,
            violationAction,
            allowedTimeWindows: days.map(day => ({
                dayOfWeek: day,
                startTime,
                endTime
            }))
        };
        await onSave(updatedSchedule);
    };

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-sm space-y-2">
                <div className="flex items-center justify-between">
                    <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wider">Current Schedule</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${schedule?.isActive ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                        {schedule?.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div className="font-mono text-lg">
                    Mon-Sun: <span className="text-foreground">{startTime}</span> - <span className="text-foreground">{endTime}</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1 border-t border-border/30 mt-2">
                    Policy: {violationAction === 'logoff' ? 'Force Logoff' : 'Shutdown System'}
                </div>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium">Action on Violation</label>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant={violationAction === 'logoff' ? 'default' : 'outline'}
                        onClick={() => setViolationAction('logoff')}
                        className="w-full transition-all"
                        type="button"
                    >
                        Log Off
                    </Button>
                    <Button
                        variant={violationAction === 'shutdown' ? 'destructive' : 'outline'}
                        onClick={() => setViolationAction('shutdown')}
                        className="w-full transition-all"
                        type="button"
                    >
                        Shut Down
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                    {violationAction === 'logoff'
                        ? 'User will be logged off when time limit expires.'
                        : 'Computer will shut down when time limit expires.'}
                </p>
            </div>

            <div className="space-y-3">
                <label className="text-sm font-medium">Allowed Time Window</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Start Time</label>
                        <TimeInput
                            value={startTime}
                            onChange={setStartTime}
                            className="font-mono bg-background/50"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">End Time</label>
                        <TimeInput
                            value={endTime}
                            onChange={setEndTime}
                            className="font-mono bg-background/50"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">
                    Monitoring active during these hours. Outside this window, logout policies may be enforced.
                </p>
            </div>

            <div className="pt-2">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="w-full sm:w-auto"
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </div>
        </div >
    );
}
