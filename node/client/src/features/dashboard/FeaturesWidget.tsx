import { Card, CardContent } from '@/components/ui/card';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Activity, Shield, Sliders, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMachine } from '@/context/MachineContext';
import { cn } from '@/lib/utils';
import type { AgentSettings } from '@/api/client';

interface FeaturesWidgetProps {
    settings: AgentSettings | null;
}

export function FeaturesWidget({ settings }: FeaturesWidgetProps) {
    const navigate = useNavigate();
    const { selectedMachine } = useMachine();

    if (!settings || !selectedMachine) {
        return null;
    }

    const screenshotsEnabled = !!settings.screenshots.enabled;
    const activityEnabled = !!settings.activity.enabled;
    const auditEnabled = !!settings.audit.enabled;

    const screenshotInterval = screenshotsEnabled
        ? Math.round(settings.screenshots.intervalSeconds / 60)
        : null;

    const activityInterval = activityEnabled
        ? settings.monitoring.pingIntervalSeconds
        : null;

    const features = [
        {
            id: 'screenshots',
            icon: <Eye size={16} />,
            label: 'Screenshots',
            enabled: screenshotsEnabled,
            config: screenshotInterval ? `${screenshotInterval} min` : null,
            route: 'gallery'
        },
        {
            id: 'activity',
            icon: <Activity size={16} />,
            label: 'Activity',
            enabled: activityEnabled,
            config: activityInterval ? `${activityInterval} sec` : null,
            route: 'activity'
        },
        {
            id: 'audit',
            icon: <Shield size={16} />,
            label: 'Audit',
            enabled: auditEnabled,
            config: null,
            route: 'audit'
        },
        {
            id: 'access-control',
            icon: <Sliders size={16} />,
            label: 'Access Control',
            enabled: !!settings.accessControl.enabled,
            config: null,
            route: 'control'
        }
    ];

    const handleFeatureClick = (route: string) => {
        navigate(`/${selectedMachine.id}/${route}`);
    };

    const handleManageClick = () => {
        if (selectedMachine) {
            navigate(`/${selectedMachine.id}/features`);
        }
    };

    return (
        <Card variant="glass">
            <SectionHeader
                title="System Features"
                className="pb-3"
                rightContent={<Sliders size={14} className="text-primary" />}
            />
            <CardContent className="space-y-3 pt-0">
                <div className="space-y-2">
                    {features.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => feature.enabled && handleFeatureClick(feature.route)}
                            disabled={!feature.enabled}
                            className={cn(
                                "w-full flex items-center justify-between p-2 rounded-md transition-colors group",
                                feature.enabled
                                    ? "hover:bg-accent/50 cursor-pointer"
                                    : "cursor-not-allowed opacity-60"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "text-muted-foreground",
                                    feature.enabled && "group-hover:text-foreground"
                                )}>
                                    {feature.icon}
                                </div>
                                <span className="text-sm font-medium">{feature.label}</span>
                            </div>
                            <Badge
                                variant={feature.enabled ? "default" : "secondary"}
                                className={cn(
                                    "text-[10px] h-5 min-w-[50px] justify-center",
                                    feature.enabled && "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20"
                                )}
                            >
                                {feature.enabled ? 'ON' : 'OFF'}
                            </Badge>
                        </button>
                    ))}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 mt-2"
                    onClick={handleManageClick}
                >
                    <Settings2 size={14} />
                    Manage All Features
                </Button>
            </CardContent>
        </Card>
    );
}
