import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { navigationTabs, iconMap } from './navigationConfig';
import type { AgentSettings } from '../../api/client';

interface NavigationTabsProps {
    currentView: string;
    hasMachines: boolean;
    settings: AgentSettings | null;
    onNavigate: (view: string) => void;
}

export function NavigationTabs({ currentView, hasMachines, settings, onNavigate }: NavigationTabsProps) {
    // Filter out disabled features completely
    const visibleTabs = navigationTabs.filter(tab => {
        switch (tab.id) {
            case 'gallery': return settings?.screenshots.enabled === true;
            case 'activity': return settings?.activity.enabled === true;
            case 'audit': return settings?.audit.enabled === true;
            case 'control': return settings?.accessControl.enabled === true;
            default: return true; // Dashboard always visible
        }
    });

    return (
        <div className="border-b border-white/5 py-2 overflow-x-auto">
            <div className="container mx-auto px-4 md:px-6 flex gap-2 min-w-max md:min-w-0">
                {visibleTabs.map(tab => {
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
