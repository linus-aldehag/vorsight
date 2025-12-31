import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { VorsightApi, type StatusResponse } from './api/client';
import { Dashboard } from './features/dashboard/Dashboard';
import { ScreenshotGallery } from './features/gallery/ScreenshotGallery';
import { MachineSelector } from './components/MachineSelector/MachineSelector';
import { useMachine } from './context/MachineContext';
import { LayoutDashboard, Image as ImageIcon, Settings, Shield } from 'lucide-react';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { ActivityPage } from './features/activity/ActivityPage';
import { AuditPage } from './features/audit/AuditPage';
import { Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SettingsPage } from './features/settings/SettingsPage';

export function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

function AppContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

    // Check OAuth status on mount
    useEffect(() => {
        const checkOAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/oauth/google/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setOauthConfigured(data.configured === true);
            } catch (error) {
                console.error('Failed to check OAuth status:', error);
                setOauthConfigured(false);
            }
        };

        if (isAuthenticated) {
            checkOAuth();
        }
    }, [isAuthenticated]);

    if (isLoading || (isAuthenticated && oauthConfigured === null)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Redirect to settings if OAuth not configured, otherwise dashboard
    const defaultRoute = oauthConfigured ? '/dashboard' : '/settings';

    return (
        <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route path="/settings" element={<SettingsLayout />} />
            <Route path="/:view" element={<MainLayout />} />
            <Route path="/:machineId/:view" element={<MainLayout />} />
        </Routes>
    );
}

function SettingsLayout() {
    const navigate = useNavigate();

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

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/dashboard')}
                >
                    <Settings size={18} />
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 container mx-auto overflow-auto">
                <SettingsPage />
            </main>
        </div>
    );
}

function MainLayout() {
    const { machineId, view } = useParams();
    const navigate = useNavigate();
    const { machines, selectedMachine, selectMachine } = useMachine();
    const [status, setStatus] = useState<StatusResponse | null>(null);

    // Check if we have any machines
    const hasMachines = machines.length > 0;

    // Sync URL machineId with context
    useEffect(() => {
        if (machineId && selectedMachine?.id !== machineId) {
            selectMachine(machineId);
        } else if (!machineId && selectedMachine) {
            // If no machine in URL but one is selected, update URL
            navigate(`/${selectedMachine.id}/${view || 'dashboard'}`, { replace: true });
        }
    }, [machineId, selectedMachine, view, navigate, selectMachine]);

    // Updates when machine changes in context
    useEffect(() => {
        if (selectedMachine && machineId !== selectedMachine.id) {
            navigate(`/${selectedMachine.id}/${view || 'dashboard'}`);
        }
    }, [selectedMachine, machineId, view, navigate]);


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

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/settings')}
                >
                    <Settings size={18} />
                </Button>
            </header>

            {/* Navigation Tabs */}
            <div className="border-b border-white/5 py-2">
                <div className="container mx-auto px-6 flex gap-2">
                    <Button
                        variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                        onClick={() => handleNavigation('dashboard')}
                        disabled={!hasMachines}
                        className={cn(
                            "gap-2",
                            currentView === 'dashboard' && "bg-primary/30 text-primary hover:bg-primary/40 border-primary/30",
                            !hasMachines && "opacity-40 cursor-not-allowed"
                        )}
                    >
                        <LayoutDashboard size={16} />
                        DASHBOARD
                    </Button>
                    <Button
                        variant={currentView === 'activity' ? 'default' : 'ghost'}
                        onClick={() => handleNavigation('activity')}
                        disabled={!hasMachines}
                        className={cn(
                            "gap-2",
                            currentView === 'activity' && "bg-primary/30 text-primary hover:bg-primary/40 border-primary/30",
                            !hasMachines && "opacity-40 cursor-not-allowed"
                        )}
                    >
                        <Activity size={16} />
                        ACTIVITY
                    </Button>
                    <Button
                        variant={currentView === 'gallery' ? 'default' : 'ghost'}
                        onClick={() => handleNavigation('gallery')}
                        disabled={!hasMachines}
                        className={cn(
                            "gap-2",
                            currentView === 'gallery' && "bg-primary/30 text-primary hover:bg-primary/40 border-primary/30",
                            !hasMachines && "opacity-40 cursor-not-allowed"
                        )}
                    >
                        <ImageIcon size={16} />
                        SCREENSHOTS
                    </Button>
                    <Button
                        variant={currentView === 'audit' ? 'default' : 'ghost'}
                        onClick={() => handleNavigation('audit')}
                        disabled={!hasMachines}
                        className={cn(
                            "gap-2",
                            currentView === 'audit' && "bg-primary/30 text-primary hover:bg-primary/40 border-primary/30",
                            !hasMachines && "opacity-40 cursor-not-allowed"
                        )}
                    >
                        <Shield size={16} />
                        AUDIT
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-6 container mx-auto overflow-hidden">
                {currentView === 'dashboard' && status && <Dashboard status={status} />}
                {currentView === 'gallery' && <ScreenshotGallery />}
                {currentView === 'activity' && <ActivityPage />}
                {currentView === 'audit' && <AuditPage />}
            </main>
        </div>
    );
}
