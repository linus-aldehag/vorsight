import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NumberFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    onSave: () => Promise<void>;
    min: number;
    max: number;
    hint?: string;
    saving?: boolean;
    saveLabel?: string;
}

export function NumberField({
    label,
    value,
    onChange,
    onSave,
    min,
    max,
    hint,
    saving = false,
    saveLabel = 'Save'
}: NumberFieldProps) {
    // Local state to allow empty/partial input
    const [localValue, setLocalValue] = useState(value.toString());

    // Sync from parent prop
    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow control keys
        if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;

        // Prevent non-numeric keys (allow digits 0-9)
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        // Optional: Call onChange immediately if valid, or wait for blur/save?
        // User asked for "instant validation". We can update parent immediately if valid.
        const parsed = parseInt(newVal);
        if (!isNaN(parsed) && newVal !== '') {
            // Check constraints for parent update, but allow out-of-range typing temporarily?
            // Actually, let's just push valid numbers.
            // But we shouldn't force min/max clamping while typing inside the range.
            onChange(parsed);
        }
    };

    const handleBlur = () => {
        let parsed = parseInt(localValue);
        if (isNaN(parsed)) parsed = min;

        // Clamp on blur
        if (parsed < min) parsed = min;
        if (parsed > max) parsed = max;

        setLocalValue(parsed.toString());
        onChange(parsed);
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex gap-2">
                <Input
                    type="text"
                    inputMode="numeric"
                    value={localValue}
                    onKeyDown={handleKeyDown}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="font-mono bg-background/50 max-w-[120px]"
                />
                <Button
                    onClick={onSave}
                    disabled={saving}
                    size="sm"
                >
                    {saving ? 'Saving...' : saveLabel}
                </Button>
            </div>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}
