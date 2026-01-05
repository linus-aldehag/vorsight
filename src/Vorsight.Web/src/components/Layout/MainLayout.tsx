import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMachine } from '../../context/MachineContext';
import { Dashboard } from '../../features/dashboard/Dashboard';
import { ScreenshotGallery } from '../../features/gallery/ScreenshotGallery';
import { ActivityPage } from '../../features/activity/ActivityPage';
import { AuditPage } from '../../features/audit/AuditPage';
import { AccessControlPage } from '../../features/schedule/AccessControlPage';
import { AppHeader } from './AppHeader';
import { NavigationTabs } from './NavigationTabs';

export function MainLayout() {
    const { machineId, view } = useParams();
    const navigate = useNavigate();
    const { machines, selectedMachine, selectMachine } = useMachine();

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
        </div>
    );
}
