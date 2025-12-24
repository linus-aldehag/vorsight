import { useState } from 'react';
import { VorsightApi, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';
import { Settings, Activity, AlertCircle } from 'lucide-react';

interface ActivitySettingsProps {
    settings: AgentSettings;
    onSettingsChange: (settings: AgentSettings) => void;
}

export function ActivitySettings({ settings, onSettingsChange }: ActivitySettingsProps) {
    const { selectedMachine } = useMachine();
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(settings.pingIntervalSeconds > 0);
    const [interval, setInterval] = useState(settings.pingIntervalSeconds || 30);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!selectedMachine) return;

        setSaving(true);
        setError(null);

        try {
            const updatedSettings = {
                ...settings,
                pingIntervalSeconds: enabled ? interval : 0,
                isMonitoringEnabled: enabled || settings.screenshotIntervalSeconds > 0
            };

            await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            onSettingsChange(updatedSettings);
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
                        <Activity size={20} className="text-primary" />
                        Activity Tracking
                    </DialogTitle>
                    <DialogDescription>
                        Configure activity monitoring and heartbeat settings
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
                            <div className="font-medium">Enable Activity Tracking</div>
                            <div className="text-sm text-muted-foreground">
                                Monitor active windows and system heartbeat
                            </div>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>

                    {enabled && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-sm font-medium">Ping Interval (seconds)</label>
                            <Input
                                type="number"
                                value={interval}
                                onChange={(e) => setInterval(parseInt(e.target.value) || 30)}
                                min={5}
                                max={300}
                                className="font-mono"
                            />
                            <p className="text-xs text-muted-foreground">
                                Range: 5 - 300 seconds (recommended: 15-60)
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
