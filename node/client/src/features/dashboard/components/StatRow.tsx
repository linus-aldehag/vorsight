import { Progress } from '@/components/ui/progress';

interface StatRowProps {
    label: string;
    value: string | number;
    percentage: number;
}

export function StatRow({ label, value, percentage }: StatRowProps) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[70%]">{label}</span>
                <span>{value}</span>
            </div>
            <Progress value={percentage} className="h-1.5 bg-secondary" />
        </div>
    );
}
