import { useEffect, useState } from 'react';
import { Input, type InputProps } from './input';
import { useSettings } from '../../context/SettingsContext';

interface TimeInputProps extends Omit<InputProps, 'value' | 'onChange'> {
    value: string; // HH:mm format
    onChange: (value: string) => void;
}

export function TimeInput({ value, onChange, className, ...props }: TimeInputProps) {
    const { timeFormat, formatTimeInput, parseTimeInput } = useSettings();
    const [inputValue, setInputValue] = useState('');

    // Update local input value when internal value or format changes
    useEffect(() => {
        setInputValue(formatTimeInput(value));
    }, [value, timeFormat, formatTimeInput]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleBlur = () => {
        const parsed = parseTimeInput(inputValue);
        if (parsed) {
            onChange(parsed);
            setInputValue(formatTimeInput(parsed)); // Re-format to ensure canonical display
        } else {
            // If invalid, revert to last valid known value
            setInputValue(formatTimeInput(value));
        }
    };

    return (
        <div className="relative">
            <Input
                {...props}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className={className}
                placeholder={timeFormat === '12h' ? '08:00 AM' : '08:00'}
            />
            {timeFormat === '12h' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none opacity-50">
                    12h
                </div>
            )}
        </div>
    );
}
