import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MachineManager } from '../../features/machines/MachineManager';
import { useMachine } from '../../context/MachineContext';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { AppHeader } from './AppHeader';

export function SettingsLayout() {
    const navigate = useNavigate();
    const { machines, pendingMachines } = useMachine();
    const [managerOpen, setManagerOpen] = useState(false);
    const [managerStartTab, setManagerStartTab] = useState<'active' | 'pending' | 'archived'>('active');

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-mono selection:bg-primary/20">
            <AppHeader
                onSettingsClick={() => navigate(-1)}
                onMachineSelectorClick={() => {
                    setManagerStartTab(machines.length === 0 && pendingMachines.length > 0 ? 'pending' : 'active');
                    setManagerOpen(true);
                }}
                isSettingsPage={true}
                showSelector={false}
            />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 container mx-auto overflow-auto">
                <SettingsPage />
            </main>

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
