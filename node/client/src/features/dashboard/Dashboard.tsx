import { type AgentSettings, VorsightApi } from '@/api/client';
import { Card } from '@/components/ui/card';
import { HealthStats } from './HealthStats';
import { ActivityMonitor } from './ActivityMonitor';
import { AuditAlert } from './AuditAlert';
import { ScreenshotViewer } from './ScreenshotViewer';
import { FeaturesWidget } from './FeaturesWidget';
import { useActivitySummary, ActivityTimelineCard, TopProcessesCard } from './ActivityStats';

import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useMachine } from '@/context/MachineContext';
import { socketService } from '@/services/socket';

import { LogsDrawer } from '../machines/components/LogsDrawer';
import { FloatingLogButton } from '../machines/components/FloatingLogButton';
import { settingsEvents } from '@/lib/settingsEvents';

export function Dashboard() {
    const { selectedMachine } = useMachine();
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [machineVersion, setMachineVersion] = useState<string | null>(null);
    const [isLogsOpen, setIsLogsOpen] = useState(false);

    // Fetch activity data here to pass to cards
    const activitySummary = useActivitySummary(selectedMachine?.id);

    const loadSettings = () => {
        if (selectedMachine) {
            VorsightApi.getSettings(selectedMachine.id)
                .then(setSettings)
                .catch(console.error);
        }
    };

    useEffect(() => {
        if (selectedMachine) {
            loadSettings();

            // Listen for machine state updates to capture version
            const handleMachineState = (data: any) => {
                if (data.machineId === selectedMachine.id && data.state?.version) {
                    setMachineVersion(data.state.version);
                }
            };

            socketService.on('machine:state', handleMachineState);

            return () => {
                socketService.off('machine:state', handleMachineState);
            };
        }
    }, [selectedMachine]);

    // Listen for settings updates from any page
    useEffect(() => {
        const unsubscribe = settingsEvents.subscribe(loadSettings);
        return unsubscribe;
    }, [selectedMachine]);

    return (
        <div className="flex flex-col gap-4 sm:gap-6 h-full pb-4">

            {/* Main Grid: 2 Rows, 3 Columns on Large Screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr">

                {/* --- Row 1 --- */}

                {/* 1. System Status */}
                <div className="min-h-[300px]">
                    <HealthStats
                        version={machineVersion}
                        onToggleLogs={() => setIsLogsOpen(prev => !prev)}
                    />
                </div>

                {/* 2. System Features (Moved Up) */}
                <div className="min-h-[300px]">
                    <FeaturesWidget settings={settings} />
                </div>

                {/* 3. Latest Screenshot */}
                <div className="min-h-[300px] flex flex-col">
                    <ScreenshotViewer
                        isDisabled={!selectedMachine || selectedMachine.connectionStatus === 'offline'}
                        isMonitoringEnabled={settings?.isScreenshotEnabled}
                    />
                </div>


                {/* --- Row 2 (Activity Related) --- */}

                {/* 4. Activity Timeline */}
                <div className="min-h-[300px]">
                    <ActivityTimelineCard
                        summary={activitySummary}
                        isDisabled={!settings?.isActivityEnabled}
                    />
                    {!activitySummary && selectedMachine && (
                        <Card variant="glass" className="h-full flex items-center justify-center p-6 opacity-60">
                            <div className="text-muted-foreground text-sm">Loading Timeline...</div>
                        </Card>
                    )}
                </div>

                {/* 5. Top Processes */}
                <div className="min-h-[300px]">
                    <TopProcessesCard
                        summary={activitySummary}
                        isDisabled={!settings?.isActivityEnabled}
                    />
                    {!activitySummary && selectedMachine && (
                        <Card variant="glass" className="h-full flex items-center justify-center p-6 opacity-60">
                            <div className="text-muted-foreground text-sm">Loading Processes...</div>
                        </Card>
                    )}
                </div>

                {/* 6. Current Activity (Activity Monitor) */}
                <div className="min-h-[300px]">
                    <ActivityMonitor isDisabled={!settings?.isActivityEnabled} />
                </div>

            </div>

            {/* Bottom Section: Audit Log */}
            <Card variant="glass">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold tracking-wide uppercase">
                        Audit Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <AuditAlert />
                </CardContent>
            </Card>




            {selectedMachine && (
                <>
                    <FloatingLogButton
                        onClick={() => setIsLogsOpen(true)}
                        isOpen={isLogsOpen}
                    />
                    <LogsDrawer
                        isOpen={isLogsOpen}
                        onClose={() => setIsLogsOpen(false)}
                        machineId={selectedMachine.id}
                    />
                </>
            )}
        </div>
    );
}
