import { useState, useEffect } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useMachine } from "@/context/MachineContext";
import { ActivityTable } from "./components/ActivityTable";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { ActivitySettings } from "./ActivitySettings";
import { VorsightApi, type AgentSettings } from "@/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function ActivityPage() {
    const { selectedMachine } = useMachine();
    const { activities, isLoading, isError } = useActivity(selectedMachine?.id);
    const [activeTab, setActiveTab] = useState("timeline");
    const [settings, setSettings] = useState<AgentSettings>({
        screenshotIntervalSeconds: 60,
        pingIntervalSeconds: 30,
        isMonitoringEnabled: true
    });

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
        } catch (err) {
            console.error('Failed to load settings:', err);
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
                <ActivitySettings
                    settings={settings}
                    onSettingsChange={(newSettings) => setSettings(newSettings)}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        Showing the last 100 recorded activities for {selectedMachine.name}.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-[400px] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : isError ? (
                        <div className="text-red-500">Failed to load activity log.</div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                            <TabsList>
                                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                                <TabsTrigger value="table">Table</TabsTrigger>
                            </TabsList>
                            <TabsContent value="timeline" className="space-y-4">
                                <ActivityTimeline activities={activities} />
                            </TabsContent>
                            <TabsContent value="table" className="space-y-4">
                                <ActivityTable activities={activities} />
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
