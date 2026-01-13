import { useState, useEffect } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useMachine } from "@/context/MachineContext";
import { ActivityTable } from "./components/ActivityTable";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { ActivityFilters } from "./ActivityFilters";
import { VorsightApi, type AgentSettings } from "@/api/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Activity } from "lucide-react";
import { ConfigSection } from "@/components/common/ConfigSection";
import { ActivityConfig } from "./ActivityConfig";
import { settingsEvents } from "@/lib/settingsEvents";

import { useUIState } from "@/context/UIStateContext";

export function ActivityPage() {
    const { selectedMachine } = useMachine();
    const { activities, isLoading, isError } = useActivity(selectedMachine?.id);
    const {
        activityViewMode: activeTab,
        setActivityViewMode: setActiveTab,
        activityDateRange: dateRangeFilter,
        setActivityDateRange: setDateRangeFilter
    } = useUIState();

    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();
        }
    }, [selectedMachine]);

    // Auto-switch to timeline view on mobile
    // Auto-switch to timeline view on mobile
    useEffect(() => {
        const mediaQuery = window.matchMedia('(min-width: 768px)'); // Match Tailwind 'md' breakpoint

        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            // If strictly mobile (< 768px) and in table view, switch to timeline
            if (!e.matches && activeTab === 'table') {
                setActiveTab('timeline');
            }
        };

        // Check initial state
        handleChange(mediaQuery);

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [activeTab]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const handleActivitySave = async (updates: Partial<AgentSettings>) => {
        if (!selectedMachine || !settings) return;
        setSaving(true);
        try {
            const updatedSettings = { ...settings, ...updates };
            const response = await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            setSettings(response);
            settingsEvents.emit();
        } catch (err) {
            console.error('Failed to save settings:', err);
        } finally {
            setSaving(false);
        }
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
            {/* Configuration Section with Header */}
            {settings && (
                <ConfigSection
                    icon={<Activity size={24} />}
                    title="Activity Log"
                    badge={!settings.activity.enabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                            Tracking Disabled
                        </span>
                    )}
                >
                    <ActivityConfig
                        settings={settings}
                        onSave={handleActivitySave}
                        saving={saving}
                    />
                </ConfigSection>
            )}



            {/* Filters */}
            <ActivityFilters
                dateRangeFilter={dateRangeFilter}
                onDateRangeFilterChange={setDateRangeFilter}
            />

            <Tabs defaultValue={activeTab} onValueChange={(val) => setActiveTab(val as 'timeline' | 'table')}>
                <div className="hidden md:block mb-4">
                    <TabsList className="w-full grid grid-cols-1 md:grid-cols-2">
                        <TabsTrigger value="timeline">Timeline View</TabsTrigger>
                        <TabsTrigger value="table" className="hidden md:flex">Table View</TabsTrigger>
                    </TabsList>
                </div>

                <Card>
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
                </Card>
            </Tabs>
        </div>
    );
}
