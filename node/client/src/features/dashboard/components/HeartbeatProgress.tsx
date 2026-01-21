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

        let animationFrameId: number;

        const updateProgress = () => {
            const last = new Date(lastSeen).getTime();
            const now = new Date().getTime();
            const diff = now - last;
            const totalMs = intervalSeconds * 1000;

            // Calculate percentage remaining (starts at 100, goes to 0)
            const percentRemaining = Math.max(0, Math.min(100, 100 - (diff / totalMs) * 100));

            setProgress(percentRemaining);

            if (percentRemaining > 0) {
                animationFrameId = requestAnimationFrame(updateProgress);
            }
        };

        // Start loop
        updateProgress();

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [lastSeen, intervalSeconds]);

    // Determine color based on freshness
    // > 66% = Green (Fresh)
    // 33-66% = Yellow (Aging)
    // < 33% = Red (Stale)
    // 0% = Red/Empty

    const getColor = (p: number) => {
        if (p > 66) return "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]";
        if (p > 33) return "bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.4)]";
        return "bg-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.4)]";
    };

    return (
        <div className={cn("h-1 w-full bg-secondary/30 rounded-full overflow-hidden", className)}>
            <div
                className={cn("h-full", getColor(progress))}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
