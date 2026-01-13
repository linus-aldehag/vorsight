import { useState } from 'react';
import type { AgentSettings } from '@/api/client';
import { NumberField, ToggleField } from '@/components/common/form-fields';

interface ScreenshotConfigProps {
    settings: AgentSettings;
    onSave: (updates: Partial<AgentSettings>) => Promise<void>;
    saving: boolean;
}

export function ScreenshotConfig({ settings, onSave, saving }: ScreenshotConfigProps) {
    const [screenshotInterval, setScreenshotInterval] = useState(Math.round(settings.screenshots.intervalSeconds / 60));
    const [filterDuplicates, setFilterDuplicates] = useState(settings.screenshots.filterDuplicates ?? true);

    const handleIntervalSave = async () => {
        await onSave({
            screenshots: {
                ...settings.screenshots,
                intervalSeconds: screenshotInterval * 60
            }
        });
    };

    const handleFilterToggle = async (enabled: boolean) => {
        setFilterDuplicates(enabled);
        await onSave({
            screenshots: {
                ...settings.screenshots,
                filterDuplicates: enabled
            }
        });
    };

    return (
        <div className="space-y-4">
            <NumberField
                label="Capture Interval (minutes)"
                value={screenshotInterval}
                onChange={setScreenshotInterval}
                onSave={handleIntervalSave}
                min={1}
                max={60}
                hint="Range: 1 - 60 minutes"
                saving={saving}
            />

            <ToggleField
                label="Filter Duplicate Screenshots"
                description="Skip uploading screenshots that are visually similar to the previous one"
                checked={filterDuplicates}
                onCheckedChange={handleFilterToggle}
                disabled={saving}
                divided
            />
        </div>
    );
}
