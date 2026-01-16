import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';

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
                <div
                    className="group p-6 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
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
                        <div className={`text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                            <ChevronDown size={20} />
                        </div>
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
