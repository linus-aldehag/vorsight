import { createContext, useContext, useState, type ReactNode } from 'react';
import { format } from 'date-fns';

type TimeFormat = '12h' | '24h';

interface SettingsContextType {
    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;
    formatTimestamp: (date: Date | number | string, options?: TimestampOptions) => string;
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

    return (
        <SettingsContext.Provider value={{
            timeFormat,
            setTimeFormat: setTimeFormatAndSave,
            formatTimestamp
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
