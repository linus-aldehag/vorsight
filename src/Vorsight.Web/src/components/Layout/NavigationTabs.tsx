import { LayoutDashboard, Activity, Image as ImageIcon, Shield, Sliders } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { navigationTabs } from './navigationConfig';

interface NavigationTabsProps {
    currentView: string;
    hasMachines: boolean;
    onNavigate: (view: string) => void;
}

const iconMap = {
    dashboard: LayoutDashboard,
    activity: Activity,
    gallery: ImageIcon,
    audit: Shield,
    control: Sliders
};

export function NavigationTabs({ currentView, hasMachines, onNavigate }: NavigationTabsProps) {
    return (
        <div className="border-b border-white/5 py-2 overflow-x-auto">
            <div className="container mx-auto px-4 md:px-6 flex gap-2 min-w-max md:min-w-0">
                {navigationTabs.map(tab => {
                    const Icon = iconMap[tab.icon];
                    return (
                        <Button
                            key={tab.id}
                            variant={currentView === tab.id ? 'default' : 'ghost'}
                            onClick={() => onNavigate(tab.id)}
                            disabled={!hasMachines}
                            title={tab.title}
                            className={cn(
                                "gap-2 shrink-0",
                                currentView === tab.id && "bg-primary/30 text-primary hover:bg-primary/40 border-primary/30",
                                !hasMachines && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <Icon size={16} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
