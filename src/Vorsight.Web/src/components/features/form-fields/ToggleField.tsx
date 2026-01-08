import { Switch } from '@/components/ui/switch';

interface ToggleFieldProps {
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    divided?: boolean;
}

export function ToggleField({
    label,
    description,
    checked,
    onCheckedChange,
    disabled = false,
    divided = false
}: ToggleFieldProps) {
    return (
        <div className={`flex items-center justify-between ${divided ? 'border-t border-border/50 pt-4' : ''}`}>
            <div className="space-y-0.5">
                <div className="text-sm font-medium">{label}</div>
                {description && (
                    <div className="text-xs text-muted-foreground">
                        {description}
                    </div>
                )}
            </div>
            <Switch
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </div>
    );
}
