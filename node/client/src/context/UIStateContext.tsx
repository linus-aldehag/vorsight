import { createContext, useContext, useState, type ReactNode } from 'react';

// Define the shape of the UI state
interface UIState {
    // Activity Page
    activityViewMode: 'timeline' | 'table';
    setActivityViewMode: (mode: 'timeline' | 'table') => void;
    activityDateRange: '24h' | '7d' | '30d' | 'all';
    setActivityDateRange: (range: '24h' | '7d' | '30d' | 'all') => void;

    // Audit Page
    auditDateRange: '24h' | '7d' | '30d' | 'all';
    setAuditDateRange: (range: '24h' | '7d' | '30d' | 'all') => void;
    // Potentially others like status filters if needed
}

const UIStateContext = createContext<UIState | undefined>(undefined);

export function UIStateProvider({ children }: { children: ReactNode }) {
    const [activityViewMode, setActivityViewMode] = useState<'timeline' | 'table'>('timeline');
    const [activityDateRange, setActivityDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
    const [auditDateRange, setAuditDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

    return (
        <UIStateContext.Provider value={{
            activityViewMode,
            setActivityViewMode,
            activityDateRange,
            setActivityDateRange,
            auditDateRange,
            setAuditDateRange
        }}>
            {children}
        </UIStateContext.Provider>
    );
}

export function useUIState() {
    const context = useContext(UIStateContext);
    if (context === undefined) {
        throw new Error('useUIState must be used within a UIStateProvider');
    }
    return context;
}
