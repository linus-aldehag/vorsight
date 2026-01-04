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

interface ActivityTableProps {
    activities: ActivityLogEntry[];
}

export function ActivityTable({ activities }: ActivityTableProps) {
    const { formatTimestamp } = useSettings();

    return (
        <div className="rounded-md border">
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
                    {activities.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No activity recorded.
                            </TableCell>
                        </TableRow>
                    ) : (
                        activities.map((activity) => (
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
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
}
