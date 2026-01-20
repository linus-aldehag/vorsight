import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';


interface HeartbeatProgressProps {
    lastSeen?: string | Date | null;
    intervalSeconds?: number;
    className?: string;
}

export function HeartbeatProgress({
    lastSeen,
    intervalSeconds = 30,
    className
}: HeartbeatProgressProps) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!lastSeen) {
            setProgress(0);
            return;
        }

        const calculateProgress = () => {
            const last = new Date(lastSeen).getTime();
            const now = new Date().getTime();
            const diff = now - last;
            const totalMs = intervalSeconds * 1000;

            // Calculate percentage remaining (starts at 100, goes to 0)
            // If we are past the interval, we go into negative/zero
            const percentRemaining = Math.max(0, Math.min(100, 100 - (diff / totalMs) * 100));

            setProgress(percentRemaining);
        };

        // Initial calculation
        calculateProgress();

        // Update frequently for smooth animation
        const timer = setInterval(calculateProgress, 100);

        return () => clearInterval(timer);
    }, [lastSeen, intervalSeconds]);

    // Determine color based on freshness
    // > 66% = Green (Fresh)
    // 33-66% = Yellow (Aging)
    // < 33% = Red (Stale)
    // 0% = Red/Empty

    // Actually, for a "heartbeat" effect, maybe it's better to just be subtle accent color?
    // Let's stick to standard progress styling for now, maybe subtle gradient.

    const getColor = (p: number) => {
        if (p > 66) return "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]";
        if (p > 33) return "bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.4)]";
        return "bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.4)]";
    };

    return (
        <div className={cn("h-1 w-full bg-secondary/30 rounded-full overflow-hidden", className)}>
            <div
                className={cn("h-full transition-all duration-300 ease-linear", getColor(progress))}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
