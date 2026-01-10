import { type AgentSettings, VorsightApi } from '@/api/client';
import { HealthStats } from './HealthStats';
import { ActivityStats } from './ActivityStats';
import { ActivityMonitor } from './ActivityMonitor';
import { AuditAlert } from './AuditAlert';
import { SystemControls } from '../controls/SystemControls';
import { ScreenshotViewer } from './ScreenshotViewer';
import { FeaturesWidget } from './FeaturesWidget';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <div className="flex flex-col gap-4 sm:gap-6 h-full pb-4"> {/* Add padding bottom */}
            {/* Top Section: Main grid - Mobile-first */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                {/* Main View - stack on mobile, 8/12 cols on large */}
                <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6">
                    {/* Row 1: Health & Current Activity - side by side on small screens and up */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <HealthStats
                            version={machineVersion}
                            onToggleLogs={() => setIsLogsOpen(prev => !prev)}
                        />
                        <ActivityMonitor isDisabled={!settings?.isActivityEnabled} />
                    </div>

                    {/* Row 2: Activity Stats - Expand to fill space */}
                    <div className="flex-1 min-h-0">
                        <ActivityStats isDisabled={!settings?.isActivityEnabled} />
                    </div>
                </div>

                {/* Side Panel - full width on mobile, 4/12 cols on large */}
                <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
                    {/* Screenshot Viewer */}
                    <div className="min-h-[300px] lg:min-h-0 lg:flex-1">
                        <ScreenshotViewer isDisabled={!settings?.isScreenshotEnabled} />
                    </div>

                    {/* Features Widget */}
                    <FeaturesWidget settings={settings} />

                    {/* System Controls - hide on mobile, show on large screens */}
                    <Card className="hidden lg:block border-border/50 bg-card/50 backdrop-blur-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold tracking-wide uppercase">
                                System Control
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <SystemControls />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Audit Log */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold tracking-wide uppercase">
                        Audit Log
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <AuditAlert />
                </CardContent>
            </Card>

            {/* Mobile-only: System Controls at bottom */}
            <Card className="lg:hidden border-border/50 bg-card/50 backdrop-blur-sm mb-12"> {/* Add margin bottom for status bar */}
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold tracking-wide uppercase">
                        System Control
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <SystemControls />
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
