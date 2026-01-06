import { useState, useEffect, useCallback } from 'react';
import { VorsightApi, type AgentSettings } from '@/api/client';

export function useHealthStats(machineId?: string) {
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!machineId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const data = await VorsightApi.getSettings(machineId);
            setSettings(data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [machineId]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, isLoading, error, refreshSettings: fetchSettings };
}
