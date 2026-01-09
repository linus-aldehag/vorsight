import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { LoginPage } from './components/LoginPage';
import { MainLayout } from './components/Layout/MainLayout';
import { SettingsLayout } from './components/Layout/SettingsLayout';

export function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <AppContent />
            </SettingsProvider>
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
