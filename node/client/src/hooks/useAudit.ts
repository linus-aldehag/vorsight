import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export interface AuditEvent {
    id: number;
    machineId: string;
    eventId: string;
    eventType: string;
    username: string;
    timestamp: string;
    details: string | Record<string, any>;
    sourceLogName: string;
    isFlagged: boolean;
    acknowledged: boolean;
    createdAt: string;
}

export function useRecentAuditEvents(machineId: string) {
    const { data, error, isLoading, mutate } = useSWR<AuditEvent[]>(
        machineId ? `/api/web/v1/audit?machineId=${machineId}&limit=5&flaggedOnly=true` : null,
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
        machineId ? `/api/web/v1/audit?machineId=${machineId}&limit=${limit}&offset=${offset}` : null,
        fetcher
    );

    return {
        auditEvents: data ?? [],
        isLoading,
        isError: error,
        mutate
    };
}
