import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useSettings } from "@/context/SettingsContext";
import type { ActivityLogEntry } from "@/hooks/useActivity";
import { mergeSequentialActivities } from "../utils/mergeActivities";
import { Monitor, Terminal, FileText } from "lucide-react";

interface ActivityTableProps {
    activities: ActivityLogEntry[];
}

export function ActivityTable({ activities }: ActivityTableProps) {
    const { formatTimestamp } = useSettings();
    const mergedActivities = mergeSequentialActivities(activities);

    return (
        <div className="h-full w-full">
            <Table variant="glass">
                <TableHeader className="bg-[var(--glass-bg)] backdrop-blur sticky top-0 z-10 border-b border-[var(--glass-border)]">
                    <TableRow className="hover:bg-transparent border-b-[var(--glass-border)]">
                        <TableHead className="w-[180px] h-auto py-2">Time</TableHead>
                        <TableHead className="h-auto py-2">Activity</TableHead>
                        <TableHead className="text-right w-[100px] h-auto py-2">Duration</TableHead>
                        <TableHead className="w-[120px] text-right h-auto py-2">User</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mergedActivities.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                No activity recorded.
                            </TableCell>
                        </TableRow>
                    ) : (
                        mergedActivities.map((activity) => (
                            <TableRow
                                key={activity.id}
                                className="border-b-[var(--glass-border)] hover:bg-muted/10 transition-colors"
                            >
                                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground py-2 h-auto">
                                    {formatTimestamp(activity.timestamp, { includeDate: true, includeSeconds: true })}
                                </TableCell>
                                <TableCell className="max-w-[400px] py-2 h-auto">
                                    <div className="flex items-start gap-3 w-full overflow-hidden">
                                        <div className="mt-1 shrink-0">
                                            <AppIcon name={activity.process_name} />
                                        </div>
                                        <div className="min-w-0 flex-1 overflow-hidden">
                                            <div
                                                className="font-medium text-foreground leading-tight truncate"
                                                title={activity.active_window || activity.process_name || 'Unknown Activity'}
                                            >
                                                {activity.active_window || activity.process_name || 'Unknown Activity'}
                                            </div>
                                            {activity.active_window && activity.process_name && (
                                                <div
                                                    className="text-xs text-muted-foreground mt-0.5 font-mono truncate"
                                                    title={activity.process_name}
                                                >
                                                    {activity.process_name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-xs py-2 h-auto">{formatDuration(activity.duration)}</TableCell>
                                <TableCell className="font-medium text-xs text-right text-muted-foreground py-2 h-auto">{activity.username || '-'}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (!seconds || seconds < 60) return seconds ? `${seconds}s` : "-";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function AppIcon({ name }: { name: string }) {
    const n = (name || '').toLowerCase();
    if (n.includes("chrome") || n.includes("edge") || n.includes("firefox")) return <Monitor className="h-4 w-4 text-blue-500" />;
    if (n.includes("code") || n.includes("visual")) return <Terminal className="h-4 w-4 text-cyan-500" />;
    return <FileText className="h-4 w-4 text-slate-500" />;
}
