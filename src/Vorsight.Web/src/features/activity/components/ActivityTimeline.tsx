import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import type { ActivityLogEntry } from "@/hooks/useActivity";
import { Monitor, Terminal, FileText } from "lucide-react";
import { mergeSequentialActivities } from "../utils/mergeActivities";

interface ActivityTimelineProps {
    activities: ActivityLogEntry[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
    const mergedActivities = mergeSequentialActivities(activities);

    // Group activities by date (not hour)
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
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
            <div className="space-y-8">
                {mergedActivities.length === 0 ? (
                    <div className="text-center text-muted-foreground p-8">No activity recorded.</div>
                ) : (
                    sortedKeys.map((key) => (
                        <div key={key} className="relative">
                            <div className="sticky top-0 z-10 bg-background/95 pb-4 pt-2 font-semibold backdrop-blur-sm">
                                {format(new Date(key), "EEEE, MMMM d, yyyy")}
                            </div>
                            <div className="ml-4 space-y-4 border-l-2 pl-4">
                                {groupedActivities[key].map((activity) => (
                                    <div key={activity.id} className="relative">
                                        <div className="absolute -left-[25px] mt-1.5 h-4 w-4 rounded-full border bg-background" />
                                        <div className="mb-1 text-sm font-medium leading-none text-muted-foreground">
                                            {format(new Date(activity.timestamp), "HH:mm:ss")}
                                        </div>
                                        <div className="rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center gap-2">
                                                <AppIcon name={activity.process_name} />
                                                <span className="font-semibold">{activity.process_name}</span>
                                            </div>
                                            {activity.active_window && (
                                                <div className="mt-1 text-sm text-foreground/80 truncate" title={activity.active_window}>
                                                    {activity.active_window}
                                                </div>
                                            )}
                                            {activity.duration > 0 && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Duration: {formatDuration(activity.duration)}
                                                </div>
                                            )}
                                            {activity.username && (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    User: {activity.username}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
    );
}

function AppIcon({ name }: { name: string }) {
    const n = name.toLowerCase();
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
