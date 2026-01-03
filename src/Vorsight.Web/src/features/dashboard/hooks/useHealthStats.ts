import { useState, useEffect } from 'react';
import { VorsightApi, type AgentSettings } from '@/api/client';

export function useHealthStats(machineId?: string) {
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!machineId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        VorsightApi.getSettings(machineId)
            .then((data) => {
                setSettings(data);
                setError(null);
            })
            .catch((err) => {
                console.error('Failed to fetch settings:', err);
                setError(err);
            })
            .finally(() => setIsLoading(false));
    }, [machineId]);

    return { settings, isLoading, error };
}
