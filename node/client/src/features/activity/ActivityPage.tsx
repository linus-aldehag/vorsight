import { useState, useEffect } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useMachine } from "@/context/MachineContext";
import { ActivityTable } from "./components/ActivityTable";
import { ActivityTimeline } from "./components/ActivityTimeline";
import { ActivityFilters } from "./ActivityFilters";
import { VorsightApi, type AgentSettings } from "@/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Activity as ActivityIcon } from "lucide-react";
import { ConfigSection } from "@/components/common/ConfigSection";
import { ActivityConfig } from "./ActivityConfig";
import { settingsEvents } from "@/lib/settingsEvents";

import { useUIState } from "@/context/UIStateContext";

export function ActivityPage() {
    const { selectedMachine } = useMachine();
    const { activities, isLoading, isError } = useActivity(selectedMachine?.id);
    const {
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
                    icon={<ActivityIcon size={24} />}
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
                            {/* Desktop View: Table */}
                            <div className="hidden md:block">
                                <ActivityTable activities={filteredActivities} />
                            </div>

                            {/* Mobile View: Timeline */}
                            <div className="md:hidden">
                                <ActivityTimeline activities={filteredActivities} />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
