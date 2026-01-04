import { useState } from 'react';
import { VorsightApi, type AccessSchedule } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { TimeInput } from '../../components/ui/time-input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';
import { Settings, Clock, AlertCircle } from 'lucide-react';

interface AccessControlSettingsProps {
    schedule: AccessSchedule | null;
    onScheduleChange: (schedule: AccessSchedule) => void;
}

export function AccessControlSettings({ schedule, onScheduleChange }: AccessControlSettingsProps) {
    const { selectedMachine } = useMachine();
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(schedule?.isActive ?? false);
    const [startTime, setStartTime] = useState(getStartTime(schedule));
    const [endTime, setEndTime] = useState(getEndTime(schedule));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function getStartTime(sched: AccessSchedule | null): string {
        if (sched?.allowedTimeWindows && sched.allowedTimeWindows.length > 0) {
            return sched.allowedTimeWindows[0].startTime || '08:00';
        }
        return '08:00';
    }

    function getEndTime(sched: AccessSchedule | null): string {
        if (sched?.allowedTimeWindows && sched.allowedTimeWindows.length > 0) {
            return sched.allowedTimeWindows[0].endTime || '22:00';
        }
        return '22:00';
    }

    const handleSave = async () => {
        if (!selectedMachine || !schedule) return;

        setSaving(true);
        setError(null);

        try {
            const updatedSchedule = {
                ...schedule,
                isActive: enabled,
                allowedTimeWindows: [{
                    dayOfWeek: 0,
                    startTime: startTime,
                    endTime: endTime
                }]
            };

            await VorsightApi.saveSchedule(selectedMachine.id, updatedSchedule);
            onScheduleChange(updatedSchedule);
            setOpen(false);
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Settings size={16} />
                    Configure
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock size={20} className="text-primary" />
                        Access Control
                    </DialogTitle>
                    <DialogDescription>
                        Configure time-based access restrictions and enforcement
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {error && (
                        <div className="bg-destructive/10 text-destructive border border-destructive/50 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <div className="font-medium">Enable Access Control</div>
                            <div className="text-sm text-muted-foreground">
                                Enforce time window restrictions
                            </div>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>

                    {enabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <TimeInput
                                        value={startTime}
                                        onChange={setStartTime}
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <TimeInput
                                        value={endTime}
                                        onChange={setEndTime}
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground border-l-2 border-primary/20 pl-3">
                                Outside of these hours, the system will enforce logout policies. Ensure critical services are excluded from OS-level enforcement if necessary.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
