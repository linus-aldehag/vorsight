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

import { useEffect } from 'react';
import { socketService } from '@/services/socket';

export function useRecentAuditEvents(machineId: string) {
    const { data, error, isLoading, mutate } = useSWR<AuditEvent[]>(
        machineId ? `/audit?machineId=${machineId}&limit=5&unacknowledgedOnly=true` : null,
        fetcher,
        {
            refreshInterval: 10000, // Refresh every 10 seconds
            revalidateOnFocus: true
        }
    );

    useEffect(() => {
        if (!machineId) return;
        const handleAudit = () => mutate();
        socketService.on('audit:alert', handleAudit);
        return () => {
            socketService.off('audit:alert', handleAudit);
        };
    }, [machineId, mutate]);

    return {
        auditEvents: data ?? [],
        isLoading,
        isError: error,
        mutate
    };
}

export function useAuditEvents(machineId: string, limit = 100, offset = 0) {
    const { data, error, isLoading, mutate } = useSWR<AuditEvent[]>(
        machineId ? `/audit?machineId=${machineId}&limit=${limit}&offset=${offset}` : null,
        fetcher
    );

    useEffect(() => {
        if (!machineId) return;
        const handleAudit = () => mutate();
        socketService.on('audit:alert', handleAudit);
        return () => {
            socketService.off('audit:alert', handleAudit);
        };
    }, [machineId, mutate]);

    return {
        auditEvents: data ?? [],
        isLoading,
        isError: error,
        mutate
    };
}
