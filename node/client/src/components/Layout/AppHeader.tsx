import { Settings, X } from 'lucide-react';
import { MachineSelector } from '../MachineSelector/MachineSelector';
import { Button } from '../ui/button';

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
    return (
        <header className="border-b border-border/10 min-h-16 flex items-center px-4 md:px-6 shrink-0 bg-surface/50 backdrop-blur-sm z-50">
            <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                <h1 className="text-lg md:text-xl tracking-wider font-bold text-foreground shrink-0">
                    VÖRSIGHT
                </h1>

                <div className="flex-1 flex justify-center min-w-0 px-2">
                    <MachineSelector onClick={onMachineSelectorClick} />
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
