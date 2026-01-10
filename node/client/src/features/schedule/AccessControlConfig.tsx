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

        const updatedSchedule: AccessSchedule = {
            ...schedule,
            violationAction,
            allowedTimeWindows: [{
                dayOfWeek: 0,
                startTime,
                endTime
            }]
        };
        await onSave(updatedSchedule);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Action on Violation</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setViolationAction('logoff')}
                        className={`p-2 text-sm border rounded-md transition-colors ${violationAction === 'logoff'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-accent'
                            }`}
                    >
                        Log Off
                    </button>
                    <button
                        onClick={() => setViolationAction('shutdown')}
                        className={`p-2 text-sm border rounded-md transition-colors ${violationAction === 'shutdown'
                                ? 'bg-destructive text-destructive-foreground border-destructive'
                                : 'bg-background hover:bg-accent'
                            }`}
                    >
                        Shut Down
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">
                    {violationAction === 'logoff'
                        ? 'User will be logged off when time limit expires.'
                        : 'Computer will shut down when time limit expires.'}
                </p>
            </div>
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
                onClick={handleSave}
                disabled={saving}
                size="sm"
            >
                {saving ? 'Saving...' : 'Save Schedule'}
            </Button>
            <p className="text-xs text-muted-foreground">
                Monitoring active during these hours. Outside this window, logout policies may be enforced.
            </p>
        </div >
    );
}
