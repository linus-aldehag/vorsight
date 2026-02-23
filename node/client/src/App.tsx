import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { UIStateProvider } from './context/UIStateContext';
import { useMachine, MachineProvider } from './context/MachineContext';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/Layout/MainLayout';
import { SettingsLayout } from './components/Layout/SettingsLayout';
import { useUIState } from './context/UIStateContext';

export function App() {
    return (
        <AuthProvider>
            <UIStateProvider>
                <SettingsProvider>
                    <MachineProvider>
                        <AppContent />
                    </MachineProvider>
                </SettingsProvider>
            </UIStateProvider>
        </AuthProvider>
    );
}

function AppContent() {
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const { isLoading: isMachinesLoading } = useMachine();
    const { isDriveConnected, checkDriveConfig } = useUIState();

    // Check OAuth status on mount
    useEffect(() => {
        if (isAuthenticated) {
            checkDriveConfig();
        }
    }, [isAuthenticated]);



    if (isAuthLoading || (isAuthenticated && (isDriveConnected === null || isMachinesLoading))) {
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
    const defaultRoute = isDriveConnected ? '/dashboard' : '/settings';

    return (
        <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace state={{ returnTo: '/dashboard' }} />} />
            <Route path="/settings" element={<SettingsLayout />} />
            <Route path="/:view" element={<MainLayout />} />
            <Route path="/:machineId/:view" element={<MainLayout />} />
        </Routes>
    );
}
