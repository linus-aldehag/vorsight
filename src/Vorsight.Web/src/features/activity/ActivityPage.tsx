import { useState, useEffect } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useMachine } from "@/context/MachineContext";
import { ActivityTable } from "./components/ActivityTable";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { VorsightApi, type AgentSettings } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Activity, Settings2, AlertCircle, X } from "lucide-react";

export function ActivityPage() {
    const { selectedMachine } = useMachine();
    const { activities, isLoading, isError } = useActivity(selectedMachine?.id);
    const [activeTab, setActiveTab] = useState("timeline");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [settings, setSettings] = useState<AgentSettings>({
        screenshotIntervalSeconds: 300,
        pingIntervalSeconds: 30,
        isMonitoringEnabled: true
    });
    const [enabled, setEnabled] = useState(true);
    const [interval, setInterval] = useState(30);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();
        }
    }, [selectedMachine]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
            setEnabled(data.pingIntervalSeconds > 0);
            setInterval(data.pingIntervalSeconds || 30);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const handleApply = async () => {
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
            setSettings(updatedSettings);
            setIsConfigOpen(false);
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (!selectedMachine) {
        return <div className="p-8 text-center text-muted-foreground">Select a machine to view activity.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
                    <p className="text-muted-foreground">
                        View application usage and window activity history.
                    </p>
                </div>

                {/* Compact inline configuration */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Activity size={16} className="text-muted-foreground" />
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            className="scale-90"
                        />
                        <span className={enabled ? "text-foreground" : "text-muted-foreground"}>
                            {enabled ? `Every ${interval}s` : 'Disabled'}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsConfigOpen(true)}
                        className="gap-1.5 h-8"
                    >
                        <Settings2 size={14} />
                        Configure
                    </Button>
                </div>
            </div>

            {/* Configuration Modal */}
            {isConfigOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsConfigOpen(false)} />
                    <div className="fixed right-6 top-32 z-50 w-[360px] border border-border bg-card shadow-2xl rounded-lg">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity size={16} className="text-primary" />
                                <h3 className="font-semibold text-sm">Ping Interval</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsConfigOpen(false)}
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        <div className="p-4 space-y-4">
                            {error && (
                                <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                    <AlertCircle size={12} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Interval (seconds)</label>
                                <Input
                                    type="number"
                                    value={interval}
                                    onChange={(e) => setInterval(parseInt(e.target.value) || 30)}
                                    min={5}
                                    max={300}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Range: 5-300 seconds (recommended: 30-60)
                                </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        loadSettings();
                                        setIsConfigOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    disabled={saving}
                                    className="flex-1"
                                >
                                    {saving ? 'Applying...' : 'Apply'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Card>
                <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
                    <CardHeader>
                        <TabsList className="w-full grid grid-cols-2">
                            <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                            <TabsTrigger value="table">Table View</TabsTrigger>
                        </TabsList>
                    </CardHeader>

                    <CardContent>
                        {isLoading && (
                            <div className="flex items-center justify-center p-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {isError && (
                            <div className="p-8 text-center text-destructive">
                                Failed to load activity data.
                            </div>
                        )}

                        {!isLoading && !isError && (
                            <>
                                <TabsContent value="timeline" className="mt-0">
                                    <ActivityTimeline activities={activities} />
                                </TabsContent>

                                <TabsContent value="table" className="mt-0">
                                    <ActivityTable activities={activities} />
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}
