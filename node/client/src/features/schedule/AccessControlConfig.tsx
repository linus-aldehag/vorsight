import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TimeInput } from '@/components/ui/time-input';
import type { AccessControlSettings } from '@/api/client';

interface AccessControlConfigProps {
    settings: AccessControlSettings;
    onSave: (settings: AccessControlSettings) => Promise<void>;
    saving: boolean;
}

export function AccessControlConfig({ settings, onSave, saving }: AccessControlConfigProps) {
    const [mode, setMode] = useState<'simple' | 'custom'>(
        settings.scheduleMode || (settings.schedule && settings.schedule.length > 1 ? 'custom' : 'simple')
    );

    // Ordered days for display
    const orderedDays: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> =
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    const dayLabels: Record<string, string> = {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday'
    };

    // Simple Mode State
    const [simpleStart, setSimpleStart] = useState(
        settings.schedule?.[0]?.startTime || '08:00'
    );
    const [simpleEnd, setSimpleEnd] = useState(
        settings.schedule?.[0]?.endTime || '22:00'
    );

    // Custom Mode State (Initialize 7 days)
    const [customWindows, setCustomWindows] = useState<{ day: string, start: string, end: string, enabled: boolean }[]>([]);

    useEffect(() => {
        // Initialize windows based on ordered days
        setCustomWindows(orderedDays.map(dayKey => {
            // Find existing schedule for this day
            // We need to match string day keys
            const existing = settings.schedule?.find(w => w.dayOfWeek === dayKey);
            return {
                day: dayKey,
                start: existing?.startTime || '08:00',
                end: existing?.endTime || '22:00',
                enabled: !!existing
            };
        }));
    }, [settings.schedule]);

    const [violationAction, setViolationAction] = useState<'logoff' | 'shutdown'>(
        settings.violationAction || 'logoff'
    );

    // Sync state when settings prop updates
    useEffect(() => {
        setSimpleStart(settings.schedule?.[0]?.startTime || '08:00');
        setSimpleEnd(settings.schedule?.[0]?.endTime || '22:00');
        setViolationAction(settings.violationAction || 'logoff');
        if (settings.scheduleMode) {
            setMode(settings.scheduleMode);
        }
    }, [settings]);

    const isValidTime = (time: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);

    const handleSave = async () => {
        // Validate Simple Mode times
        if (mode === 'simple') {
            if (!isValidTime(simpleStart) || !isValidTime(simpleEnd)) {
                console.error("Invalid time format in simple mode");
                return;
            }
        }

        let newSchedule;

        if (mode === 'simple') {
            // Apply to all days
            newSchedule = orderedDays.map(day => ({
                dayOfWeek: day,
                startTime: simpleStart,
                endTime: simpleEnd
            }));
        } else {
            // Validate Custom Mode times
            const invalidWindow = customWindows.find(w => w.enabled && (!isValidTime(w.start) || !isValidTime(w.end)));
            if (invalidWindow) {
                console.error("Invalid time format in custom mode");
                return;
            }

            // Filter only enabled days
            newSchedule = customWindows
                .filter(w => w.enabled)
                .map(w => ({
                    dayOfWeek: w.day as any, // Cast to match strict literal type if needed
                    startTime: w.start,
                    endTime: w.end
                }));
        }

        const updatedSettings: AccessControlSettings = {
            enabled: true, // Implicitly enable when saving configuration
            scheduleMode: mode,
            violationAction,
            schedule: newSchedule
        };
        await onSave(updatedSettings);
    };

    const updateCustomDay = (dayKey: string, field: 'start' | 'end' | 'enabled', value: any) => {
        setCustomWindows(prev => prev.map(d =>
            d.day === dayKey ? { ...d, [field]: value } : d
        ));
    };

    const handleModeChange = (newMode: 'simple' | 'custom') => {
        setMode(newMode);
        if (newMode === 'custom') {
            // Sync custom windows with current simple settings if they are currently all disabled or default
            // Actually, best to just pre-fill enabled days with simple times
            setCustomWindows(prev => prev.map(w => ({
                ...w,
                start: simpleStart,
                end: simpleEnd,
                enabled: true
            })));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 bg-muted/20 p-2 rounded-lg w-fit">
                    <Button
                        variant={mode === 'simple' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleModeChange('simple')}
                        className="text-xs"
                    >
                        Simple (Every Day)
                    </Button>
                    <Button
                        variant={mode === 'custom' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => handleModeChange('custom')}
                        className="text-xs"
                    >
                        Custom (Per Weekday)
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
                                        {dayLabels[dayWindow.day].substring(0, 3)}
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

            <div className="space-y-3 pt-4 border-t border-border/50">
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
        </div>
    );
}
