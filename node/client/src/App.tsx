import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { UIStateProvider } from './context/UIStateContext';
import { useMachine, MachineProvider } from './context/MachineContext';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/Layout/MainLayout';
import { SettingsLayout } from './components/Layout/SettingsLayout';

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
    const { machines, isLoading: isMachinesLoading } = useMachine();
    const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Check OAuth status on mount
    useEffect(() => {
        const checkOAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const response = await fetch('/api/oauth/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
                setOauthConfigured(data.connected === true);
            } catch (error) {
                console.error('Failed to check OAuth status:', error);
                setOauthConfigured(false);
            }
        };

        if (isAuthenticated) {
            checkOAuth();
        }
    }, [isAuthenticated]);

    // Handle redirection when no machines are available
    useEffect(() => {
        if (isAuthenticated && !isMachinesLoading && machines.length === 0) {
            // If not already on a settings page, redirect to settings
            if (!location.pathname.startsWith('/settings')) {
                navigate('/settings', { replace: true });
            }
        }
    }, [isAuthenticated, isMachinesLoading, machines.length, location.pathname, navigate]);

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

    // Redirect to settings if OAuth not configured OR no machines available, otherwise dashboard
    const defaultRoute = (oauthConfigured && machines.length > 0) ? '/dashboard' : '/settings';

    return (
        <Routes>
            <Route path="/" element={<Navigate to={defaultRoute} replace />} />
            <Route path="/settings" element={<SettingsLayout />} />
            <Route path="/:view" element={<MainLayout />} />
            <Route path="/:machineId/:view" element={<MainLayout />} />
        </Routes>
    );
}
