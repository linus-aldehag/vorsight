import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronUp, Settings2, CheckCircle2, Circle } from 'lucide-react';

interface ExpandableFeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    saving: boolean;
    children?: React.ReactNode;
}

export function ExpandableFeatureCard({ icon, title, description, enabled, onToggle, saving, children }: ExpandableFeatureCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasConfig = !!children;

    return (
        <Card variant="glass">
            <CardContent className="p-0">
                {/* Header */}
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="text-primary">{icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{title}</h4>
                                {enabled ? (
                                    <CheckCircle2 size={16} className="text-green-500" />
                                ) : (
                                    <Circle size={16} className="text-muted-foreground" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Switch
                                checked={enabled}
                                onCheckedChange={onToggle}
                                disabled={saving}
                            />
                            {hasConfig && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="gap-1.5"
                                    disabled={!enabled}
                                    title={!enabled ? "Enable feature to configure" : isExpanded ? "Hide configuration" : "Show configuration"}
                                >
                                    <Settings2 size={14} />
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expandable Configuration */}
                {children && isExpanded && (
                    <div className="border-t border-border/50 p-6 pt-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                        {children}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
