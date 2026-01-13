import { useState } from 'react';
import type { AgentSettings } from '@/api/client';
import { NumberField } from '@/components/common/form-fields';

interface ActivityConfigProps {
    settings: AgentSettings;
    onSave: (updates: Partial<AgentSettings>) => Promise<void>;
    saving: boolean;
}

export function ActivityConfig({ settings, onSave, saving }: ActivityConfigProps) {
    const [activityInterval, setActivityInterval] = useState(settings.monitoring.pingIntervalSeconds);

    const handleSave = async () => {
        await onSave({
            monitoring: {
                ...settings.monitoring,
                pingIntervalSeconds: activityInterval
            }
        });
    };

    return (
        <NumberField
            label="Heartbeat Interval (seconds)"
            value={activityInterval}
            onChange={setActivityInterval}
            onSave={handleSave}
            min={5}
            max={300}
            hint="Range: 5 - 300 seconds"
            saving={saving}
        />
    );
}
