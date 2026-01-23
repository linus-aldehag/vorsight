import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { UIStateProvider } from './context/UIStateContext';
import { useMachine, MachineProvider } from './context/MachineContext';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/Layout/MainLayout';
import { SettingsLayout } from './components/Layout/SettingsLayout';
import api from './lib/axios';

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
    const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

    // Check OAuth status on mount
    useEffect(() => {
        const checkOAuth = async () => {
            try {
                const response = await api.get('/oauth/status');
                setOauthConfigured(response.data.connected === true);
            } catch (error) {
                console.error('Failed to check OAuth status:', error);
                setOauthConfigured(false);
            }
        };

        if (isAuthenticated) {
            checkOAuth();
        }
    }, [isAuthenticated]);



    if (isAuthLoading || (isAuthenticated && (oauthConfigured === null || isMachinesLoading))) {
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
            <Route path="/" element={<Navigate to={defaultRoute} replace state={{ returnTo: '/dashboard' }} />} />
            <Route path="/settings" element={<SettingsLayout />} />
            <Route path="/:view" element={<MainLayout />} />
            <Route path="/:machineId/:view" element={<MainLayout />} />
        </Routes>
    );
}
