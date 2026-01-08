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
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <div className="flex gap-2">
                <Input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value) || min)}
                    min={min}
                    max={max}
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
