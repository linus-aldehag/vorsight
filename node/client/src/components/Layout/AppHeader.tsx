import { Settings, X, AlertTriangle, HardDrive, ExternalLink } from 'lucide-react';
import { MachineSelector } from '../MachineSelector/MachineSelector';
import { Button } from '../ui/button';
import { useUIState } from '../../context/UIStateContext';
import { useNavigate } from 'react-router-dom';

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
    return (
        <header className="border-b border-border/10 min-h-16 flex items-center px-4 md:px-6 shrink-0 bg-surface/50 backdrop-blur-sm z-50">
            <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                <h1 className="text-lg md:text-xl tracking-wider font-bold text-foreground shrink-0">
                    VÖRSIGHT
                </h1>

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
