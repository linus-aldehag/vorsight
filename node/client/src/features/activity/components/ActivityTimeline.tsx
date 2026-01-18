import { format } from "date-fns";
import type { ActivityLogEntry } from "@/hooks/useActivity";
import { Monitor, Terminal, FileText } from "lucide-react";
import { mergeSequentialActivities } from "../utils/mergeActivities";

interface ActivityTimelineProps {
    activities: ActivityLogEntry[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
    const mergedActivities = mergeSequentialActivities(activities).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Group activities by date
    const groupedActivities = mergedActivities.reduce((acc, activity) => {
        const date = new Date(activity.timestamp);
        const key = format(date, "yyyy-MM-dd");
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(activity);
        return acc;
    }, {} as Record<string, ActivityLogEntry[]>);

    const sortedKeys = Object.keys(groupedActivities).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <div className="w-full">
            <div className="space-y-8">
                {mergedActivities.length === 0 ? (
                    <div className="text-center text-muted-foreground p-8">No activity recorded.</div>
                ) : (
                    sortedKeys.map((key) => (
                        <div key={key} className="relative">
                            <div className="sticky top-0 z-10 flex justify-center pb-6 pt-2 pointer-events-none">
                                <span className="bg-background/80 backdrop-blur-md border border-border/50 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm text-muted-foreground">
                                    {format(new Date(key), "EEEE, MMMM d, yyyy")}
                                </span>
                            </div>

                            {/* Timeline Container */}
                            <div className="ml-4 border-l-2 border-border pl-4 space-y-8 pb-4">
                                {groupedActivities[key].map((activity) => (
                                    <div key={activity.id} className="relative">
                                        {/* Dot: 
                                            Container has pl-4 (16px).
                                            Border is 2px.
                                            Relative parent starts inside the padding.
                                            Border center is at -17px from content start (16px padding + 1px half-border).
                                            Dot radius is 6px.
                                            Center of dot needs to be at -17px.
                                            Left of dot needs to be -17px - 6px = -23px.
                                        */}
                                        <div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />

                                        <div className="rounded-lg border bg-card p-3 shadow-sm">
                                            <div className="flex items-start gap-3 w-full overflow-hidden">
                                                <div className="mt-0.5 shrink-0">
                                                    <AppIcon name={activity.process_name} />
                                                </div>
                                                <div className="min-w-0 flex-1 overflow-hidden">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="font-semibold text-foreground leading-tight truncate text-sm">
                                                            {activity.active_window || activity.process_name || 'Unknown Activity'}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">
                                                            {format(new Date(activity.timestamp), "HH:mm:ss")}
                                                        </div>
                                                    </div>

                                                    {activity.active_window && activity.process_name && (
                                                        <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                                                            {activity.process_name}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between mt-2">
                                                        {activity.duration > 0 && (
                                                            <div className="inline-flex items-center rounded-sm bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
                                                                {formatDuration(activity.duration)}
                                                            </div>
                                                        )}

                                                        {activity.username && (
                                                            <div className="text-[10px] text-muted-foreground/60 truncate ml-auto pl-2 max-w-[50%]">
                                                                {activity.username}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function AppIcon({ name }: { name: string }) {
    const n = (name || '').toLowerCase();
    if (n.includes("chrome") || n.includes("edge") || n.includes("firefox")) return <Monitor className="h-4 w-4 text-blue-500" />;
    if (n.includes("code") || n.includes("visual")) return <Terminal className="h-4 w-4 text-cyan-500" />;
    return <FileText className="h-4 w-4 text-slate-500" />;
}

function formatDuration(seconds: number): string {
    if (!seconds || seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
