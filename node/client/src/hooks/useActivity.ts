import useSWRInfinite from 'swr/infinite';
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
    const getKey = (pageIndex: number, previousPageData: ActivityLogEntry[] | null) => {
        if (!machineId) return null;
        if (previousPageData && previousPageData.length < limit) return null; // reached the end
        return `/activity/${machineId}?limit=${limit}&offset=${pageIndex * limit}`;
    };

    const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<ActivityLogEntry[]>(
        getKey,
        fetcher,
        {
            revalidateFirstPage: false,
            revalidateOnFocus: false,
        }
    );

    const activities = data ? data.flat() : [];
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const isEmpty = data?.[0]?.length === 0;
    const isReachingEnd = isEmpty || (data && data[data.length - 1]?.length < limit);

    return {
        activities,
        isLoading,
        isError: error,
        isValidating,
        size,
        setSize,
        mutate,
        isLoadingMore,
        isReachingEnd
    };
}
