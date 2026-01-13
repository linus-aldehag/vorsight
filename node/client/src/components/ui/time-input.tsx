import { useEffect, useState } from 'react';
import { Input, type InputProps } from './input';
import { useSettings } from '../../context/SettingsContext';
import { Clock } from 'lucide-react';

interface TimeInputProps extends Omit<InputProps, 'value' | 'onChange'> {
    value: string; // HH:mm format
    onChange: (value: string) => void;
}

export function TimeInput({ value, onChange, className, ...props }: TimeInputProps) {
    const { timeFormat, formatTimeInput, parseTimeInput } = useSettings();
    const [inputValue, setInputValue] = useState('');

    // Reset local input when external value changes
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
            // Re-format canonical
            setInputValue(formatTimeInput(parsed));
        } else {
            // Revert
            setInputValue(formatTimeInput(value));
        }
    };



    // Unified Custom Input for both 12h and 24h to ensure consistent styling
    return (
        <div className="relative group">
            <Input
                {...props}
                type="text"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${className} min-w-[110px] pr-8 cursor-text`}
                placeholder={timeFormat === '12h' ? "08:00 AM" : "08:00"}
            />
            <Clock className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors pointer-events-none" />
        </div>
    );
}
