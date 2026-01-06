import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMachine } from '../../context/MachineContext';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { ScreenshotGallery } from '../../features/gallery/ScreenshotGallery';
import { ActivityPage } from '../../features/activity/ActivityPage';
import { AuditPage } from '../../features/audit/AuditPage';
import { AccessControlPage } from '../../features/schedule/AccessControlPage';
import { AppHeader } from './AppHeader';
import { NavigationTabs } from './NavigationTabs';
import { useHealthStats } from '../../features/dashboard/hooks/useHealthStats';
import { MachineOnboardingDialog } from '../../features/machines/MachineOnboardingDialog';
import { VorsightApi } from '../../api/client';
import { Badge } from '../ui/badge';
import type { Machine } from '../../context/MachineContext';

export function MainLayout() {
    const { machineId, view } = useParams();
    const navigate = useNavigate();
    const { machines, pendingMachines, selectedMachine, selectMachine, refreshMachines, onMachineDiscovered } = useMachine();
    const { settings } = useHealthStats(selectedMachine?.id);

    const [discoveredMachine, setDiscoveredMachine] = useState<Machine | null>(null);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);

    // Check if we have any machines
    const hasMachines = machines.length > 0;

    // Sync URL machineId with context
    // Note: MachineSelector handles user clicks by calling both selectMachine() and navigate()
    // This effect only handles URL changes from other sources (back/forward buttons, direct navigation)
    useEffect(() => {
        if (machineId && selectedMachine?.id !== machineId) {
            // URL has a different machine than currently selected, sync context to match URL
            selectMachine(machineId);
        } else if (!machineId && selectedMachine && view) {
            // URL has no machine but we have one selected, update URL to match
            // Use replace to avoid creating extra history entries
            navigate(`/${selectedMachine.id}/${view}`, { replace: true });
        }
    }, [machineId, selectedMachine, view, navigate, selectMachine]);

    // Listen for machine discoveries
    useEffect(() => {
        if (onMachineDiscovered) {
            onMachineDiscovered((machine) => {
                setDiscoveredMachine(machine);
                setToastVisible(true);
                // Auto-hide toast after 10 seconds
                setTimeout(() => setToastVisible(false), 10000);
            });
        }
    }, [onMachineDiscovered]);

    const handleAdopt = async (machineId: string, options: {
        displayName: string;
        enableScreenshots: boolean;
        enableActivity: boolean;
        enableAudit: boolean;
    }) => {
        await VorsightApi.adoptMachine(machineId, options);
        setToastVisible(false);
        refreshMachines();
    };

    const handleNavigation = (newView: string) => {
        if (selectedMachine) {
            navigate(`/${selectedMachine.id}/${newView}`);
        } else {
            navigate(`/${newView}`);
        }
    };

    const currentView = view || 'dashboard';

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-mono selection:bg-primary/20">
            <AppHeader onSettingsClick={() => navigate('/settings')} />

            <NavigationTabs
                currentView={currentView}
                hasMachines={hasMachines}
                settings={settings}
                onNavigate={handleNavigation}
            />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 container mx-auto overflow-hidden">
                {currentView === 'dashboard' && <Dashboard />}
                {currentView === 'gallery' && <ScreenshotGallery />}
                {currentView === 'activity' && <ActivityPage />}
                {currentView === 'audit' && <AuditPage />}
                {currentView === 'control' && <AccessControlPage />}
            </main>

            {/* Discovery Toast Notification */}
            {toastVisible && discoveredMachine && (
                <div className="fixed bottom-4 right-4 z-50 max-w-md">
                    <div className="bg-card border border-border rounded-lg shadow-lg p-4 space-y-3 animate-in slide-in-from-bottom-5">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🔍</span>
                            <div className="flex-1 space-y-1">
                                <h4 className="font-semibold text-sm">New Machine Discovered</h4>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{discoveredMachine.name}</span>
                                    {discoveredMachine.hostname && ` (${discoveredMachine.hostname})`}
                                </p>
                            </div>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                Pending
                            </Badge>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setToastVisible(false)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-accent transition-colors"
                            >
                                Dismiss
                            </button>
                            <button
                                onClick={() => {
                                    setShowOnboarding(true);
                                    setToastVisible(false);
                                }}
                                className="flex-1 px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                Set Up Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Machines Indicator */}
            {pendingMachines.length > 0 && !toastVisible && (
                <div className="fixed bottom-4 right-4 z-40">
                    <button
                        onClick={() => {
                            setDiscoveredMachine(pendingMachines[0]);
                            setShowOnboarding(true);
                        }}
                        className="bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <span>🔍</span>
                        <span>{pendingMachines.length} Pending Machine{pendingMachines.length !== 1 ? 's' : ''}</span>
                    </button>
                </div>
            )}

            {/* Onboarding Dialog */}
            <MachineOnboardingDialog
                machine={discoveredMachine}
                open={showOnboarding}
                onOpenChange={setShowOnboarding}
                onAdopt={handleAdopt}
            />
        </div>
    );
}
