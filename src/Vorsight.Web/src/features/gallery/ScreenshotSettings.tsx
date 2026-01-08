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
import { Settings, Eye, AlertCircle } from 'lucide-react';

interface ScreenshotSettingsProps {
    settings: AgentSettings;
    onSettingsChange: (settings: AgentSettings) => void;
}

export function ScreenshotSettings({ settings, onSettingsChange }: ScreenshotSettingsProps) {
    const { selectedMachine } = useMachine();
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(settings.screenshotIntervalSeconds > 0);
    const [interval, setInterval] = useState(settings.screenshotIntervalSeconds || 60);
    const [filterDuplicates, setFilterDuplicates] = useState(settings.filterDuplicateScreenshots ?? true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!selectedMachine) return;

        setSaving(true);
        setError(null);

        try {
            const updatedSettings = {
                ...settings,
                screenshotIntervalSeconds: enabled ? interval : 0,
                filterDuplicateScreenshots: filterDuplicates,
                isMonitoringEnabled: enabled || settings.pingIntervalSeconds > 0
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
                        <Eye size={20} className="text-primary" />
                        Screenshot Monitoring
                    </DialogTitle>
                    <DialogDescription>
                        Configure screenshot capture settings for this machine
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
                            <div className="font-medium">Enable Screenshot Monitoring</div>
                            <div className="text-sm text-muted-foreground">
                                Capture screenshots at regular intervals
                            </div>
                        </div>
                        <Switch checked={enabled} onCheckedChange={setEnabled} />
                    </div>

                    {enabled && (
                        <>
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-sm font-medium">Capture Interval (seconds)</label>
                                <Input
                                    type="number"
                                    value={interval}
                                    onChange={(e) => setInterval(parseInt(e.target.value) || 60)}
                                    min={10}
                                    max={600}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Range: 10 - 600 seconds (recommended: 60-300)
                                </p>
                            </div>

                            <div className="flex items-center justify-between border-t pt-4">
                                <div className="space-y-0.5">
                                    <div className="font-medium">Filter Duplicate Screenshots</div>
                                    <div className="text-sm text-muted-foreground">
                                        Skip uploading screenshots that are visually similar to the previous one
                                    </div>
                                </div>
                                <Switch checked={filterDuplicates} onCheckedChange={setFilterDuplicates} />
                            </div>
                        </>
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
