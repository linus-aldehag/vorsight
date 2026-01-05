import { LayoutDashboard, Activity, Image as ImageIcon, Shield, Sliders, Ban } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { navigationTabs } from './navigationConfig';
import type { AgentSettings } from '../../api/client';

interface NavigationTabsProps {
    currentView: string;
    hasMachines: boolean;
    settings: AgentSettings | null;
    onNavigate: (view: string) => void;
}

const iconMap = {
    dashboard: LayoutDashboard,
    activity: Activity,
    gallery: ImageIcon,
    audit: Shield,
    control: Sliders
};

export function NavigationTabs({ currentView, hasMachines, settings, onNavigate }: NavigationTabsProps) {
    // Check which features are disabled
    const isScreenshotsDisabled = settings?.screenshotIntervalSeconds === 0;
    const isActivityDisabled = settings?.pingIntervalSeconds === 0;
    const isAuditDisabled = settings?.isAuditEnabled === false;

    const getDisabledStatus = (tabId: string): boolean => {
        switch (tabId) {
            case 'gallery': return isScreenshotsDisabled;
            case 'activity': return isActivityDisabled;
            case 'audit': return isAuditDisabled;
            default: return false;
        }
    };
    return (
        <div className="border-b border-white/5 py-2 overflow-x-auto">
            <div className="container mx-auto px-4 md:px-6 flex gap-2 min-w-max md:min-w-0">
                {navigationTabs.map(tab => {
                    const Icon = iconMap[tab.icon];
                    const isDisabled = getDisabledStatus(tab.id);
                    return (
                        <Button
                            key={tab.id}
                            variant={currentView === tab.id ? 'default' : 'ghost'}
                            onClick={() => onNavigate(tab.id)}
                            disabled={!hasMachines}
                            title={isDisabled ? `${tab.title} (Disabled)` : tab.title}
                            className={cn(
                                "gap-2 shrink-0 relative",
                                currentView === tab.id && "bg-primary/30 text-primary hover:bg-primary/40 border-primary/30",
                                !hasMachines && "opacity-40 cursor-not-allowed"
                            )}
                        >
                            <div className="relative">
                                <Icon size={16} className={cn(isDisabled && "opacity-40")} />
                                {isDisabled && (
                                    <Ban
                                        size={10}
                                        className="absolute -top-1 -right-1 text-destructive bg-background rounded-full"
                                        strokeWidth={3}
                                    />
                                )}
                            </div>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
