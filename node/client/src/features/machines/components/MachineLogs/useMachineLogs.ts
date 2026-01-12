import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { LogEntry } from './types';

export function useMachineLogs(machineId: string, pollingInterval = 10000) {
    const { token } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!machineId || !token) return;

            try {
                // Fetch latest 100 logs
                const res = await fetch(`/api/web/v1/logs/${machineId}?limit=100`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        if (pollingInterval > 0) {
            const interval = setInterval(fetchLogs, pollingInterval);
            return () => clearInterval(interval);
        }
    }, [machineId, token, pollingInterval]);

    return { logs, loading };
}
