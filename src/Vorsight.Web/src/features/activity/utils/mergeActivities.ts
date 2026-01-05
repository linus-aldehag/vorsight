import type { ActivityLogEntry } from "@/hooks/useActivity";

/**
 * Merges sequential identical activities into longer sessions.
 * Activities with the same process name and window title are combined,
 * with their durations accumulated.
 */
export function mergeSequentialActivities(activities: ActivityLogEntry[]): ActivityLogEntry[] {
    if (activities.length === 0) return [];

    // Sort chronologically first
    const sorted = [...activities].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const merged: ActivityLogEntry[] = [];
    let current = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const activity = sorted[i];
        const isSame = activity.process_name === current.process_name &&
            activity.active_window === current.active_window;

        if (isSame) {
            // Merge by adding duration
            current.duration = (current.duration || 0) + (activity.duration || 0);
        } else {
            merged.push(current);
            current = { ...activity };
        }
    }
    merged.push(current);

    return merged;
}
