import { type AgentSettings, VorsightApi } from '@/api/client';
import { Card } from '@/components/ui/card';
import { HealthStats } from './HealthStats';
import { ActivityMonitor } from './ActivityMonitor';
import { AuditAlert } from './AuditAlert';
import { ScreenshotViewer } from './ScreenshotViewer';
import { FeaturesWidget } from './FeaturesWidget';
import { useActivitySummary, ActivityTimelineCard, TopProcessesCard } from './ActivityStats';
import { Button } from '@/components/ui/button';
import { Monitor, Download } from 'lucide-react';

import { CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useMachine } from '@/context/MachineContext';
import { socketService } from '@/services/socket';

import { LogsDrawer } from '../machines/components/LogsDrawer';
import { FloatingLogButton } from '../machines/components/FloatingLogButton';
import { settingsEvents } from '@/lib/settingsEvents';

interface DashboardProps {
    onManageMachines?: (tab?: 'active' | 'pending' | 'archived') => void;
}

export function Dashboard({ onManageMachines }: DashboardProps) {
    const { selectedMachine, machines, pendingMachines } = useMachine();
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

    // Empty State Handling: No Active Machines
    if (!selectedMachine && machines.length === 0) {
        const hasPending = pendingMachines.length > 0;

        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="max-w-md w-full space-y-8">
                    <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                        <div className="relative bg-background p-4 rounded-full border-2 border-primary/50 text-primary">
                            <Monitor size={48} />
                            {hasPending && (
                                <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm ring-4 ring-background">
                                    {pendingMachines.length}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {hasPending ? "New Machine Detected" : "Welcome to Vorsight"}
                        </h2>
                        <p className="text-muted-foreground">
                            {hasPending
                                ? "One or more machines are waiting for your approval to join the network."
                                : "No machines are currently connected. Install the agent on a computer to get started."}
                        </p>
                    </div>

                    <div className="flex gap-4 justify-center">
                        {hasPending ? (
                            <Button
                                size="lg"
                                onClick={() => onManageMachines?.('pending')}
                                className="w-full sm:w-auto min-w-[200px]"
                            >
                                Review Pending Machines
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={() => window.open('https://github.com/linus-aldehag/vorsight/releases', '_blank')}
                            >
                                <Download size={16} />
                                Download Agent
                            </Button>
                        )}
                    </div>

                    {!hasPending && (
                        <Card className="p-4 bg-muted/30 border-dashed">
                            <div className="text-xs text-muted-foreground text-left space-y-2 font-mono">
                                <p>1. Download the agent installer</p>
                                <p>2. Run setup on the target machine</p>
                                <p>3. Enter this server address: <span className="text-foreground select-all">{window.location.origin}</span></p>
                                <p>4. Approve the machine here</p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        );
    }

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
                        isMonitoringEnabled={settings?.screenshots.enabled}
                    />
                </div>


                {/* --- Row 2 (Activity Related) --- */}

                {/* 4. Activity Timeline */}
                <div className="min-h-[300px]">
                    <ActivityTimelineCard
                        summary={activitySummary}
                        isDisabled={!settings?.activity.enabled}
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
                        isDisabled={!settings?.activity.enabled}
                    />
                    {!activitySummary && selectedMachine && (
                        <Card variant="glass" className="h-full flex items-center justify-center p-6 opacity-60">
                            <div className="text-muted-foreground text-sm">Loading Processes...</div>
                        </Card>
                    )}
                </div>

                {/* 6. Current Activity (Activity Monitor) */}
                <div className="min-h-[300px]">
                    <ActivityMonitor isDisabled={!settings?.activity.enabled} />
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
