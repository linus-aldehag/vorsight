import { useState } from 'react';
import { Settings, X, AlertTriangle, HardDrive, ExternalLink, Gamepad2 } from 'lucide-react';
import { MachineSelector } from '../MachineSelector/MachineSelector';
import { Button } from '../ui/button';
import { useUIState } from '../../context/UIStateContext';
import { useNavigate } from 'react-router-dom';
import { DemoSplashModal } from '../../demo/DemoSplashModal';

interface AppHeaderProps {
    onSettingsClick: () => void;
    onMachineSelectorClick: () => void;
    isSettingsPage?: boolean;
    showSelector?: boolean;
}

export function AppHeader({
    onSettingsClick,
    onMachineSelectorClick,
    isSettingsPage = false
}: AppHeaderProps) {
    const { isDriveConnected } = useUIState();
    const navigate = useNavigate();
    const [showDemoModal, setShowDemoModal] = useState(false);

    return (
        <header className="border-b border-border/10 min-h-16 flex items-center px-4 md:px-6 shrink-0 bg-surface/50 backdrop-blur-sm z-50">
            {showDemoModal && <DemoSplashModal isOpen={true} onClose={() => setShowDemoModal(false)} />}
            <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                <div className="flex items-center gap-2 shrink-0">
                    <h1 className="text-lg md:text-xl tracking-wider font-bold text-foreground">
                        VÖRSIGHT
                    </h1>
                    {import.meta.env.VITE_DEMO_MODE === 'true' && (
                        <button
                            onClick={() => setShowDemoModal(true)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors text-[10px] font-bold tracking-wider uppercase cursor-pointer"
                            title="Click for Demo Info"
                        >
                            <Gamepad2 size={12} />
                            <span className="hidden sm:inline">DEMO MODE</span>
                        </button>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center min-w-0 px-2 gap-2">
                    <MachineSelector onClick={onMachineSelectorClick} />

                    {isDriveConnected === false && (
                        <button
                            onClick={() => navigate('/settings')}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all shrink-0 group"
                            title="Google Drive Disconnected"
                        >
                            {/* Mobile View: Specific Drive Icon */}
                            <HardDrive size={14} className="animate-pulse md:hidden" />

                            {/* Desktop View: Warning + Text + Link Icon */}
                            <AlertTriangle size={14} className="animate-pulse hidden md:block" />
                            <span className="text-[10px] font-bold hidden md:inline">DRIVE ISSUE</span>
                            <ExternalLink size={10} className="hidden md:block opacity-60 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSettingsClick}
                    className="shrink-0"
                    title={isSettingsPage ? "Close Settings" : "Settings"}
                >
                    {isSettingsPage ? <X size={20} /> : <Settings size={18} />}
                </Button>
            </div>
        </header>
    );
}
