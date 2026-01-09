import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export interface ActivityLogEntry {
    id: number;
    machine_id: string;
    timestamp: string; // or number if server returns epoch
    active_window: string;
    process_name: string;
    duration: number;
    username?: string;
}

export function useActivity(machineId: string | undefined, limit: number = 100) {
    const { data, error, isLoading, mutate } = useSWR<ActivityLogEntry[]>(
        machineId ? `/api/activity/${machineId}?limit=${limit}` : null,
        fetcher
    );

    return {
        activities: data || [],
        isLoading,
        isError: error,
        mutate,
    };
}
