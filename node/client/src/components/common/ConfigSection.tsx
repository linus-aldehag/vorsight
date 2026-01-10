import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

interface ConfigSectionProps {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
}

export function ConfigSection({ icon, title = "Configuration", description, badge, children }: ConfigSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card variant="glass">
            <CardContent className="p-0">
                {/* Header */}
                <div className="p-6">
                    <div className="flex items-center gap-4">
                        {icon && <div className="text-primary">{icon}</div>}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                {title}
                                {badge}
                            </h3>
                            {description && (
                                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="gap-1.5 shrink-0"
                            title={isExpanded ? "Hide configuration" : "Show configuration"}
                        >
                            <Settings2 size={14} />
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                    </div>
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                    <div className="border-t border-border/50 p-6 pt-4 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
                        {children}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
