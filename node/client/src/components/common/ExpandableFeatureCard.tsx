import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, CheckCircle2, Circle } from 'lucide-react';

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
                <div
                    className={`p-6 transition-colors duration-200 ${hasConfig && enabled ? "cursor-pointer hover:bg-muted/50" : ""}`}
                    onClick={() => hasConfig && enabled && setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-4">
                        <div className={`text-primary transition-opacity duration-200 ${enabled ? "opacity-100" : "opacity-50"}`}>
                            {icon}
                        </div>
                        <div className={`flex-1 min-w-0 transition-opacity duration-200 ${enabled ? "opacity-100" : "opacity-50"}`}>
                            <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{title}</h4>
                                {enabled ? (
                                    <CheckCircle2 size={16} className="text-success" />
                                ) : (
                                    <Circle size={16} className="text-muted-foreground" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <div onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={enabled}
                                    onCheckedChange={onToggle}
                                    disabled={saving}
                                />
                            </div>
                            {hasConfig && enabled && (
                                <div className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                    <ChevronDown size={20} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Expandable Configuration */}
                {children && isExpanded && enabled && (
                    <div className="border-t border-border/50 p-6 pt-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                        {children}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
