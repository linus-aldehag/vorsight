
import { useState } from 'react';
import { Monitor, Camera, Activity, Shield, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker/time-picker';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Machine } from '@/context/MachineContext';

interface PendingMachineItemProps {
    machine: Machine;
    onAdopt: (machineId: string, options: {
        displayName: string;
        enableScreenshots: boolean;
        enableActivity: boolean;
        enableAudit: boolean;
        enableAccessControl: boolean;
        accessControlStartTime?: string;
        accessControlEndTime?: string;
    }) => Promise<void>;
}

export function PendingMachineItem({ machine, onAdopt }: PendingMachineItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [enableScreenshots, setEnableScreenshots] = useState(true);
    const [enableActivity, setEnableActivity] = useState(true);
    const [enableAudit, setEnableAudit] = useState(true);
    const [enableAccessControl, setEnableAccessControl] = useState(true);
    const [startTime, setStartTime] = useState('07:00');
    const [endTime, setEndTime] = useState('22:00');
    const [isAdopting, setIsAdopting] = useState(false);

    const handleAdopt = async () => {
        setIsAdopting(true);
        try {
            await onAdopt(machine.id, {
                displayName,
                enableScreenshots,
                enableActivity,
                enableAudit,
                enableAccessControl,
                accessControlStartTime: startTime,
                accessControlEndTime: endTime
            });
        } catch (error) {
            console.error('Failed to adopt machine:', error);
            setIsAdopting(false);
        }
    };

    const timeStringToDate = (timeStr: string) => {
        if (!timeStr) return undefined;
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const handleTimeChange = (date: Date | undefined, setter: (val: string) => void) => {
        if (!date) return;
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setter(`${hours}:${minutes}`);
    };

    return (
        <div className={cn(
            "rounded-lg border border-primary/20 bg-primary/5 transition-all overflow-hidden",
            isExpanded ? "shadow-md" : "hover:border-primary/40"
        )}>
            {/* Header */}
            <div
                className="p-3 flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Monitor size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{machine.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/20 text-primary uppercase">
                                New
                            </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                            {machine.hostname || machine.id}
                        </span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </Button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <hr className="border-border/50" />

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">Display Name</label>
                            <Input
                                placeholder={machine.name}
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="h-8 text-sm bg-background/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Features</label>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-background/50">
                                    <div className="flex items-center gap-2">
                                        <Camera size={14} className="text-muted-foreground" />
                                        <span className="text-xs font-medium">Screenshots</span>
                                    </div>
                                    <Switch
                                        checked={enableScreenshots}
                                        onCheckedChange={setEnableScreenshots}
                                        className="scale-75 origin-right"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-background/50">
                                    <div className="flex items-center gap-2">
                                        <Activity size={14} className="text-muted-foreground" />
                                        <span className="text-xs font-medium">Activity</span>
                                    </div>
                                    <Switch
                                        checked={enableActivity}
                                        onCheckedChange={setEnableActivity}
                                        className="scale-75 origin-right"
                                    />
                                </div>

                                <div className="flex flex-col gap-2 p-2 rounded border border-border/50 bg-background/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-muted-foreground" />
                                            <span className="text-xs font-medium">Audit</span>
                                        </div>
                                        <Switch
                                            checked={enableAudit}
                                            onCheckedChange={setEnableAudit}
                                            className="scale-75 origin-right"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 p-2 rounded border border-border/50 bg-background/50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 rounded-sm border-2 border-muted-foreground/60 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full" />
                                            </div>
                                            <span className="text-xs font-medium">Access Control</span>
                                        </div>
                                        <Switch
                                            checked={enableAccessControl}
                                            onCheckedChange={setEnableAccessControl}
                                            className="scale-75 origin-right"
                                        />
                                    </div>

                                    {enableAccessControl && (
                                        <div className="grid grid-cols-2 gap-2 mt-1 animate-in slide-in-from-top-1">
                                            <div className="space-y-1 flex flex-col items-center sm:items-start">
                                                <label className="text-[10px] text-muted-foreground">Start Time</label>
                                                <TimePicker
                                                    date={timeStringToDate(startTime)}
                                                    setDate={(d) => handleTimeChange(d, setStartTime)}
                                                />
                                            </div>
                                            <div className="space-y-1 flex flex-col items-center sm:items-start">
                                                <label className="text-[10px] text-muted-foreground">End Time</label>
                                                <TimePicker
                                                    date={timeStringToDate(endTime)}
                                                    setDate={(d) => handleTimeChange(d, setEndTime)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAdopt();
                            }}
                            disabled={isAdopting}
                        >
                            {isAdopting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Add Machine
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
