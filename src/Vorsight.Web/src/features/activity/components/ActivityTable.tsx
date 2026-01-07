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

interface ActivityTableProps {
    activities: ActivityLogEntry[];
}

export function ActivityTable({ activities }: ActivityTableProps) {
    const { formatTimestamp } = useSettings();

    const mergedActivities = mergeSequentialActivities(activities);

    return (
        <div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Process</TableHead>
                        <TableHead>Window Title</TableHead>
                        <TableHead>Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {mergedActivities.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No activity recorded.
                            </TableCell>
                        </TableRow>
                    ) : (
                        mergedActivities.map((activity) => (
                            <TableRow key={activity.id}>
                                <TableCell>
                                    {formatTimestamp(activity.timestamp, { includeDate: true, includeSeconds: true })}
                                </TableCell>
                                <TableCell className="font-medium">{activity.username || '-'}</TableCell>
                                <TableCell className="font-medium">{activity.process_name}</TableCell>
                                <TableCell className="max-w-[300px] truncate" title={activity.active_window}>
                                    {activity.active_window}
                                </TableCell>
                                <TableCell>{formatDuration(activity.duration)}</TableCell>
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
