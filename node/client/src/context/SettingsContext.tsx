import { createContext, useContext, useState, type ReactNode } from 'react';
import { format } from 'date-fns';

type TimeFormat = '12h' | '24h';

interface SettingsContextType {
    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;
    formatTimestamp: (date: Date | number | string, options?: TimestampOptions) => string;
    formatTimeInput: (timeStr: string) => string;
    parseTimeInput: (inputStr: string) => string | null;
}

interface TimestampOptions {
    includeDate?: boolean;
    includeSeconds?: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [timeFormat, setTimeFormat] = useState<TimeFormat>(() => {
        const saved = localStorage.getItem('vorsight-time-format');
        return (saved === '12h' || saved === '24h') ? saved : '24h';
    });

    const setTimeFormatAndSave = (format: TimeFormat) => {
        setTimeFormat(format);
        localStorage.setItem('vorsight-time-format', format);
    };

    const formatTimestamp = (date: Date | number | string, options: TimestampOptions = {}) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            return 'Invalid Date';
        }

        let timeStr = '';
        if (timeFormat === '12h') {
            timeStr = options.includeSeconds ? 'hh:mm:ss a' : 'hh:mm a';
        } else {
            timeStr = options.includeSeconds ? 'HH:mm:ss' : 'HH:mm';
        }

        if (options.includeDate) {
            return format(d, `MMM d, ${timeStr}`);
        }

        return format(d, timeStr);
    };

    const formatTimeInput = (timeStr: string): string => {
        if (!timeStr) return '';
        if (timeFormat === '24h') return timeStr;

        // Parse HH:mm
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return timeStr;

        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);

        return format(date, 'hh:mm a');
    };

    const parseTimeInput = (inputStr: string): string | null => {
        if (!inputStr) return null;
        if (timeFormat === '24h') {
            // Validate HH:mm
            if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(inputStr)) {
                return inputStr;
            }
            // Try flexible 24h validation (e.g. 1 -> 01:00?)
            // For now assume strict or flexible date parse if fails
        }

        // Try to parse flexible format (12h or 24h input like '13:00')
        try {
            // Flexible parsing
            // For 24h, we want to return HH:mm
            // For 12h, we return HH:mm (internal value)

            // Hack for date-fns parsing flexible strings without rigid format:
            // Use native Date parsing for "2000/01/01 {input}"
            const date = new Date(`2000/01/01 ${inputStr}`);
            if (isNaN(date.getTime())) return null;

            return format(date, 'HH:mm');
        } catch {
            return null;
        }
    };

    return (
        <SettingsContext.Provider value={{
            timeFormat,
            setTimeFormat: setTimeFormatAndSave,
            formatTimestamp,
            formatTimeInput,
            parseTimeInput
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
