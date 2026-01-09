import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export interface AuditEvent {
    id: number;
    machine_id: string;
    event_id: string;
    event_type: string;
    username: string;
    timestamp: string;
    details: string;
    source_log_name: string;
    is_flagged: boolean;
    acknowledged: boolean;
    created_at: string;
}

export function useRecentAuditEvents(machineId: string) {
    const { data, error, isLoading, mutate } = useSWR<AuditEvent[]>(
        machineId ? `/api/audit/${machineId}/recent` : null,
        fetcher,
        {
            refreshInterval: 10000, // Refresh every 10 seconds
            revalidateOnFocus: true
        }
    );

    return {
        auditEvents: data ?? [],
        isLoading,
        isError: error,
        mutate
    };
}

export function useAuditEvents(machineId: string, limit = 100, offset = 0) {
    const { data, error, isLoading, mutate } = useSWR<AuditEvent[]>(
        machineId ? `/api/audit/${machineId}?limit=${limit}&offset=${offset}` : null,
        fetcher
    );

    return {
        auditEvents: data ?? [],
        isLoading,
        isError: error,
        mutate
    };
}
