import { useEffect, useState } from 'react';
import { VorsightApi, type StatusResponse } from './api/client';
import { Dashboard } from './features/dashboard/Dashboard';
import { ScheduleManager } from './features/schedule/ScheduleManager';
import { ScreenshotGallery } from './features/gallery/ScreenshotGallery';
import { MachineSelector } from './components/MachineSelector/MachineSelector';
import { useMachine } from './context/MachineContext';
import { LayoutDashboard, Settings, Image as ImageIcon } from 'lucide-react';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

function App() {
    const { selectedMachine } = useMachine();
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        if (selectedMachine) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedMachine]);

    const fetchStatus = async () => {
        if (!selectedMachine) return;

        try {
            const data = await VorsightApi.getStatus(selectedMachine.id);
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    };

    if (!status && selectedMachine) {
        // Initial loading state - could be fancier
        return (
            <div className="flex h-screen items-center justify-center bg-background text-primary">
                <div className="animate-pulse"> INITIALIZING UPLINK... </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-mono selection:bg-primary/20">
            {/* Header */}
            <header className="border-b border-white/10 h-16 flex items-center px-6 justify-between shrink-0 bg-surface/50 backdrop-blur-sm z-50">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl tracking-wider font-bold text-foreground">
                        VÖRSIGHT
                    </h1>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2">
                    <MachineSelector />
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="border-b border-white/5 py-2">
                <div className="container mx-auto px-6 flex gap-2">
                    <Button
                        variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('dashboard')}
                        className={cn("gap-2", activeTab === 'dashboard' && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20")}
                    >
                        <LayoutDashboard size={16} />
                        DASHBOARD
                    </Button>
                    <Button
                        variant={activeTab === 'settings' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('settings')}
                        className={cn("gap-2", activeTab === 'settings' && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20")}
                    >
                        <Settings size={16} />
                        SETTINGS
                    </Button>
                    <Button
                        variant={activeTab === 'gallery' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('gallery')}
                        className={cn("gap-2", activeTab === 'gallery' && "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20")}
                    >
                        <ImageIcon size={16} />
                        GALLERY
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-6 container mx-auto overflow-hidden">
                {activeTab === 'dashboard' && status && <Dashboard status={status} />}
                {activeTab === 'settings' && <ScheduleManager />}
                {activeTab === 'gallery' && <ScreenshotGallery />}
            </main>
        </div>
    );
}

export default App;
