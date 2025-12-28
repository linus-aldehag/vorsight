import { useState, useEffect } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useMachine } from "@/context/MachineContext";
import { ActivityTable } from "./components/ActivityTable";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { ActivityFilters } from "./ActivityFilters";
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
    const [tempEnabled, setTempEnabled] = useState(true); // Temporary state for modal
    const [tempInterval, setTempInterval] = useState(30); // Temporary state for modal
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

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
            const isEnabled = data.pingIntervalSeconds > 0;
            const pingInterval = data.pingIntervalSeconds || 30;
            setEnabled(isEnabled);
            setInterval(pingInterval);
            setTempEnabled(isEnabled);
            setTempInterval(pingInterval);
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
                pingIntervalSeconds: tempEnabled ? tempInterval : 0,
                isMonitoringEnabled: tempEnabled || settings.screenshotIntervalSeconds > 0
            };

            const response = await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            setSettings(response);
            setEnabled(tempEnabled);
            setInterval(tempInterval);
            setIsConfigOpen(false);
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setTempEnabled(enabled); // Reset temp state to current applied state
        setTempInterval(interval); // Reset temp state to current applied state
        setError(null); // Clear any error
        setIsConfigOpen(false);
    };

    // Apply date range filter
    const filteredActivities = activities.filter(activity => {
        if (dateRangeFilter === 'all') return true;

        const activityDate = new Date(activity.timestamp);
        const now = new Date();
        const diffHours = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);

        if (dateRangeFilter === '24h' && diffHours > 24) return false;
        if (dateRangeFilter === '7d' && diffHours > 24 * 7) return false;
        if (dateRangeFilter === '30d' && diffHours > 24 * 30) return false;

        return true;
    });

    if (!selectedMachine) {
        return <div className="p-8 text-center text-muted-foreground">Select a machine to view activity.</div>;
    }

    return (
        <div className="space-y-6">
            {/* Simple header: title + icon on left, configure button on right */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity size={24} className="text-primary" />
                    <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsConfigOpen(true)}
                    className="gap-1.5"
                >
                    <Settings2 size={16} />
                    Configure
                </Button>
            </div>

            {/* Configuration Modal */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={handleCancel}>
                    <div className="w-[360px] h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col h-full">
                            {/* Modal header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h3 className="text-lg font-semibold">Activity Tracking</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={16} />
                                </Button>
                            </div>

                            {/* Modal content */}
                            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                                {error && (
                                    <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                        <AlertCircle size={12} />
                                        {error}
                                    </div>
                                )}

                                {/* Enable/Disable Toggle */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                                        <Switch
                                            checked={tempEnabled}
                                            onCheckedChange={setTempEnabled}
                                        />
                                        <div>
                                            <div className="text-sm font-medium">
                                                {tempEnabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {tempEnabled ? 'Activity tracking is active' : 'Activity tracking is paused'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Interval Setting */}
                                {tempEnabled && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Ping Interval</label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={tempInterval}
                                                onChange={(e) => setTempInterval(Number(e.target.value))}
                                                min={10}
                                                max={300}
                                                className="w-20"
                                            />
                                            <span className="text-sm text-muted-foreground">seconds</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            How often to check active window (10-300 seconds)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Modal footer */}
                            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    disabled={saving}
                                >
                                    {saving ? 'Applying...' : 'Apply'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <ActivityFilters
                dateRangeFilter={dateRangeFilter}
                onDateRangeFilterChange={setDateRangeFilter}
            />

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
                                    <ActivityTimeline activities={filteredActivities} />
                                </TabsContent>

                                <TabsContent value="table" className="mt-0">
                                    <ActivityTable activities={filteredActivities} />
                                </TabsContent>
                            </>
                        )}
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}
