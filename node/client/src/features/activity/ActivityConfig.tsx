import { useState } from 'react';
import type { AgentSettings } from '@/api/client';
import { NumberField } from '@/components/common/form-fields';

interface ActivityConfigProps {
    settings: AgentSettings;
    onSave: (updates: Partial<AgentSettings>) => Promise<void>;
    saving: boolean;
}

export function ActivityConfig({ settings, onSave, saving }: ActivityConfigProps) {
    const [interval, setInterval] = useState(settings.activity.intervalSeconds || 10);

    const handleSave = async () => {
        await onSave({
            activity: {
                ...settings.activity,
                intervalSeconds: interval
            }
        });
    };

    return (
        <NumberField
            label="Activity Interval (seconds)"
            value={interval}
            onChange={setInterval}
            onSave={handleSave}
            min={1}
            max={60}
            hint="Range: 1 - 60 seconds"
            saving={saving}
        />
    );
}
