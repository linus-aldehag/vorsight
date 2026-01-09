import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    const screenshotsEnabled = settings.isScreenshotEnabled;
    const activityEnabled = settings.isActivityEnabled;
    const auditEnabled = settings.isAuditEnabled;

    const screenshotInterval = screenshotsEnabled
        ? Math.round(settings.screenshotIntervalSeconds / 60)
        : null;

    const activityInterval = activityEnabled
        ? settings.pingIntervalSeconds
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
            enabled: settings.isAccessControlEnabled,
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
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase flex items-center gap-2">
                    <Sliders size={14} />
                    System Features
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
