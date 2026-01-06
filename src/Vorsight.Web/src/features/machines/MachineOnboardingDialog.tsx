import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Camera, Activity, Shield, Loader2 } from 'lucide-react';
import type { Machine } from '@/context/MachineContext';

interface MachineOnboardingDialogProps {
    machine: Machine | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdopt: (machineId: string, options: {
        displayName: string;
        enableScreenshots: boolean;
        enableActivity: boolean;
        enableAudit: boolean;
    }) => Promise<void>;
}

export function MachineOnboardingDialog({ machine, open, onOpenChange, onAdopt }: MachineOnboardingDialogProps) {
    const [displayName, setDisplayName] = useState('');
    const [enableScreenshots, setEnableScreenshots] = useState(false);
    const [enableActivity, setEnableActivity] = useState(false);
    const [enableAudit, setEnableAudit] = useState(false);
    const [isAdopting, setIsAdopting] = useState(false);

    const handleAdopt = async () => {
        if (!machine) return;

        setIsAdopting(true);
        try {
            await onAdopt(machine.id, {
                displayName,
                enableScreenshots,
                enableActivity,
                enableAudit
            });
            // Reset form
            setDisplayName('');
            setEnableScreenshots(false);
            setEnableActivity(false);
            setEnableAudit(false);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to adopt machine:', error);
        } finally {
            setIsAdopting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="text-xl">🔍</span>
                        Set Up New Machine
                    </DialogTitle>
                    <DialogDescription>
                        Configure <span className="font-semibold text-foreground">{machine?.name || 'machine'}</span>
                        {machine?.hostname && ` (${machine.hostname})`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Display Name */}
                    <div className="space-y-2">
                        <label htmlFor="displayName" className="text-sm font-medium">Display Name (Optional)</label>
                        <Input
                            id="displayName"
                            placeholder={machine?.name || ''}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Friendly name for this machine
                        </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium">Enable Features</p>

                        <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Camera size={18} className="text-muted-foreground" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Screenshots</p>
                                    <p className="text-xs text-muted-foreground">
                                        Capture periodic screenshots (5 min intervals)
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={enableScreenshots}
                                onCheckedChange={setEnableScreenshots}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Activity size={18} className="text-muted-foreground" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Activity Tracking</p>
                                    <p className="text-xs text-muted-foreground">
                                        Monitor active applications and usage
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={enableActivity}
                                onCheckedChange={setEnableActivity}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <Shield size={18} className="text-muted-foreground" />
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Audit Logging</p>
                                    <p className="text-xs text-muted-foreground">
                                        Track security events and system changes
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={enableAudit}
                                onCheckedChange={setEnableAudit}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdopting}>
                        Cancel
                    </Button>
                    <Button onClick={handleAdopt} disabled={isAdopting}>
                        {isAdopting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Adopt Machine
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
