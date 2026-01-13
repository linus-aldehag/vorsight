import { useState, useEffect } from 'react';
import { Input, type InputProps } from '@/components/ui/input';

interface StrictNumberInputProps extends Omit<InputProps, 'value' | 'onChange'> {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

export function StrictNumberInput({
    value,
    onChange,
    min = 0,
    max = 100,
    className,
    ...props
}: StrictNumberInputProps) {
    const [localValue, setLocalValue] = useState(value.toString());

    useEffect(() => {
        setLocalValue(value.toString());
    }, [value]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setLocalValue(newVal);

        const parsed = parseInt(newVal);
        if (!isNaN(parsed) && newVal !== '') {
            onChange(parsed);
        }
    };

    const handleBlur = () => {
        let parsed = parseInt(localValue);
        if (isNaN(parsed)) parsed = min;
        if (parsed < min) parsed = min;
        if (parsed > max) parsed = max;

        setLocalValue(parsed.toString());
        onChange(parsed);
    };

    return (
        <Input
            {...props}
            type="text"
            inputMode="numeric"
            value={localValue}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleBlur}
            className={className}
        />
    );
}
