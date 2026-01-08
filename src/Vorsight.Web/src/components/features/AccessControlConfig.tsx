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

    const handleSave = async () => {
        if (!schedule) return;

        const updatedSchedule = {
            ...schedule,
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
        </div>
    );
}
