import { useNavigate } from 'react-router-dom';
import { SettingsPage } from '../../features/settings/SettingsPage';
import { AppHeader } from './AppHeader';

export function SettingsLayout() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-mono selection:bg-primary/20">
            <AppHeader onSettingsClick={() => navigate('/dashboard')} />

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 container mx-auto overflow-auto">
                <SettingsPage />
            </main>
        </div>
    );
}
