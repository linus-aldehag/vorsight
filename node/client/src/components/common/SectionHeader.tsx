import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface SectionHeaderProps {
    title: string;
    description?: string;
    rightContent?: ReactNode;
    className?: string;
}

export function SectionHeader({ title, description, rightContent, className }: SectionHeaderProps) {
    return (
        <CardHeader className={cn("pb-2", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-lg tracking-wide text-primary uppercase">{title}</CardTitle>
                    {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                </div>
                {rightContent && <div className="text-right">{rightContent}</div>}
            </div>
        </CardHeader>
    );
}
