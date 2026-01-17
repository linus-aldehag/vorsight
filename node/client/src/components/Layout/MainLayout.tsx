import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMachine } from '../../context/MachineContext';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { ScreenshotGallery } from '../../features/gallery/ScreenshotGallery';
import { ActivityPage } from '../../features/activity/ActivityPage';
import { AuditPage } from '../../features/audit/AuditPage';
import { AccessControlPage } from '../../features/schedule/AccessControlPage';
import { FeaturesPage } from '../../features/settings/FeaturesPage';
import { AppHeader } from './AppHeader';
import { NavigationTabs } from './NavigationTabs';
import { useHealthStats } from '../../features/dashboard/hooks/useHealthStats';
import { MachineManager } from '../../features/machines/MachineManager';
import { Badge } from '../ui/badge';
import { settingsEvents } from '../../lib/settingsEvents';
import type { Machine } from '../../context/MachineContext';

export function MainLayout() {
    const { machineId, view } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { machines, pendingMachines, selectedMachine, selectMachine, onMachineDiscovered } = useMachine();
    const { settings, refreshSettings } = useHealthStats(selectedMachine?.id);

    const [discoveredMachine, setDiscoveredMachine] = useState<Machine | null>(null);
    const [managerOpen, setManagerOpen] = useState(false);
    const [managerStartTab, setManagerStartTab] = useState<'active' | 'pending' | 'archived'>('active');
    const [toastVisible, setToastVisible] = useState(false);

    // Track if initial load logic has run
    const hasInitialLoadRun = useRef(false);

    // Check if we have any machines
    const hasMachines = machines.length > 0;

    // First Load Behavior: Auto-select machine and open manager
    useEffect(() => {
        if (!hasInitialLoadRun.current && machines.length > 0) {
            // Only if we are not already viewing a specific machine (URL param check)
            if (!machineId) {
                if (!selectedMachine) {
                    selectMachine(machines[0].id);
                }
                setManagerOpen(true);
            }
            hasInitialLoadRun.current = true;
        }
    }, [machines, machineId, selectedMachine, selectMachine]);

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

    // Redirect to dashboard if accessing a disabled feature
    useEffect(() => {
        if (!settings || !view) return;

        const isFeatureDisabled = () => {
            switch (view) {
                case 'gallery': return !settings.screenshots.enabled;
                case 'activity': return !settings.activity.enabled;
                case 'audit': return !settings.audit.enabled;
                case 'control': return !settings.accessControl.enabled;
                default: return false;
            }
        };

        if (isFeatureDisabled()) {
            const targetPath = selectedMachine ? `/${selectedMachine.id}/dashboard` : '/dashboard';
            navigate(targetPath, { replace: true });
        }
    }, [settings, view, navigate, selectedMachine]);

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

    // Listen for settings updates from any page
    useEffect(() => {
        const unsubscribe = settingsEvents.subscribe(() => {
            refreshSettings();
        });
        return unsubscribe;
    }, [refreshSettings]);



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
            <AppHeader
                onSettingsClick={() => navigate('/settings', { state: { returnTo: location.pathname } })}
                onMachineSelectorClick={() => {
                    setManagerStartTab(machines.length === 0 && pendingMachines.length > 0 ? 'pending' : 'active');
                    setManagerOpen(true);
                }}
                showSelector={machines.length !== 1 || pendingMachines.length > 0}
            />

            <NavigationTabs
                currentView={currentView}
                hasMachines={hasMachines}
                settings={settings}
                onNavigate={handleNavigation}
            />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 container mx-auto overflow-hidden">
                {currentView === 'dashboard' && (
                    <Dashboard
                        onManageMachines={(tab) => {
                            if (tab) setManagerStartTab(tab);
                            setManagerOpen(true);
                        }}
                    />
                )}
                {currentView === 'gallery' && <ScreenshotGallery />}
                {currentView === 'activity' && <ActivityPage />}
                {currentView === 'audit' && <AuditPage />}
                {currentView === 'control' && <AccessControlPage />}
                {currentView === 'features' && <FeaturesPage />}
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
                                    setManagerStartTab('pending');
                                    setManagerOpen(true);
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
                            setManagerStartTab('pending');
                            setManagerOpen(true);
                        }}
                        className="bg-primary text-primary-foreground rounded-full px-4 py-2 shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <span>🔍</span>
                        <span>{pendingMachines.length} Pending Machine{pendingMachines.length !== 1 ? 's' : ''}</span>
                    </button>
                </div>
            )}

            {/* Machine Manager Dialog */}
            {managerOpen && (
                <MachineManager
                    open={managerOpen}
                    onOpenChange={setManagerOpen}
                    defaultTab={managerStartTab}
                />
            )}
        </div>
    );
}
