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
    const [mode, setMode] = useState<'simple' | 'custom'>('simple');

    // Simple Mode State
    const [simpleStart, setSimpleStart] = useState(
        schedule?.allowedTimeWindows?.[0]?.startTime || '08:00'
    );
    const [simpleEnd, setSimpleEnd] = useState(
        schedule?.allowedTimeWindows?.[0]?.endTime || '22:00'
    );

    // Custom Mode State (Initialize 7 days)
    // 0=Sun, 1=Mon, ..., 6=Sat
    // We'll use a map or array. Array of objects is easiest.
    const [customWindows, setCustomWindows] = useState<{ day: number, start: string, end: string, enabled: boolean }[]>(
        Array.from({ length: 7 }, (_, i) => {
            // Find existing window for this day
            const existing = schedule?.allowedTimeWindows?.find(w => w.dayOfWeek === i);
            return {
                day: i,
                start: existing?.startTime || '08:00',
                end: existing?.endTime || '22:00',
                enabled: !!existing // If it exists in the list, it's enabled.
            };
        })
    );

    const [violationAction, setViolationAction] = useState<'logoff' | 'shutdown'>(
        schedule?.violationAction || 'logoff'
    );

    const handleSave = async () => {
        if (!schedule) return;

        let newWindows;

        if (mode === 'simple') {
            // Apple to all days 0-6
            const days = [0, 1, 2, 3, 4, 5, 6];
            newWindows = days.map(day => ({
                dayOfWeek: day,
                startTime: simpleStart,
                endTime: simpleEnd
            }));
        } else {
            // Filter only enabled days
            newWindows = customWindows
                .filter(w => w.enabled)
                .map(w => ({
                    dayOfWeek: w.day,
                    startTime: w.start,
                    endTime: w.end
                }));
        }

        const updatedSchedule: AccessSchedule = {
            ...schedule,
            violationAction,
            allowedTimeWindows: newWindows
        };
        await onSave(updatedSchedule);
    };

    const updateCustomDay = (dayIndex: number, field: 'start' | 'end' | 'enabled', value: any) => {
        setCustomWindows(prev => prev.map(d =>
            d.day === dayIndex ? { ...d, [field]: value } : d
        ));
    };

    const weekDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <div className="space-y-6">

            <div className="flex items-center space-x-4 bg-muted/20 p-2 rounded-lg w-fit">
                <Button
                    variant={mode === 'simple' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setMode('simple')}
                    className="text-xs"
                >
                    Simple (Every Day)
                </Button>
                <Button
                    variant={mode === 'custom' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setMode('custom')}
                    className="text-xs"
                >
                    Custom (Per Weekday)
                </Button>
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
            </div>

            {mode === 'simple' ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                    <label className="text-sm font-medium">Daily Time Window</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Start Time</label>
                            <TimeInput
                                value={simpleStart}
                                onChange={setSimpleStart}
                                className="font-mono bg-background/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">End Time</label>
                            <TimeInput
                                value={simpleEnd}
                                onChange={setSimpleEnd}
                                className="font-mono bg-background/50"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        This schedule applies to all days of the week.
                    </p>
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <label className="text-sm font-medium block">Weekly Schedule</label>
                    <div className="grid gap-3">
                        {customWindows.map((dayWindow) => (
                            <div key={dayWindow.day} className="flex items-center gap-3 p-2 rounded-md border border-border/40 bg-card/30">
                                <div className="w-24 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={dayWindow.enabled}
                                        onChange={(e) => updateCustomDay(dayWindow.day, 'enabled', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className={`text-sm ${dayWindow.enabled ? 'font-medium' : 'text-muted-foreground'}`}>
                                        {weekDayNames[dayWindow.day].substring(0, 3)}
                                    </span>
                                </div>

                                {dayWindow.enabled ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <TimeInput
                                            value={dayWindow.start}
                                            onChange={(val) => updateCustomDay(dayWindow.day, 'start', val)}
                                            className="h-8 max-w-[100px] text-xs font-mono"
                                        />
                                        <span className="text-muted-foreground text-xs">-</span>
                                        <TimeInput
                                            value={dayWindow.end}
                                            onChange={(val) => updateCustomDay(dayWindow.day, 'end', val)}
                                            className="h-8 max-w-[100px] text-xs font-mono"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 text-xs text-muted-foreground italic pl-2">
                                        Restricted (No Access)
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
