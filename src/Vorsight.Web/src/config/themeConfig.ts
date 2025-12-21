export interface Theme {
    name: string;
    displayName: string;
    colors: {
        background: string;
        surface: string;
        foreground: string;
        primary: string;
        primaryForeground: string;
        secondary: string;
        secondaryForeground: string;
        muted: string;
        mutedForeground: string;
        accent: string;
        accentForeground: string;
        destructive: string;
        destructiveForeground: string;
        card: string;
        cardForeground: string;
        popover: string;
        popoverForeground: string;
        border: string;
        input: string;
        ring: string;
        warning: string;
        success: string;
    };
}

export const themes: Record<string, Theme> = {
    cyberpunk: {
        name: 'cyberpunk',
        displayName: 'Cyberpunk',
        colors: {
            background: '#050505',
            surface: '#0D1117',
            foreground: '#ffffff',
            primary: '#00D1FF',
            primaryForeground: '#050505',
            secondary: '#0D1117',
            secondaryForeground: '#ffffff',
            muted: '#1e293b',
            mutedForeground: '#94a3b8',
            accent: '#0D1117',
            accentForeground: '#ffffff',
            destructive: '#ef4444',
            destructiveForeground: '#ffffff',
            card: '#050505',
            cardForeground: '#ffffff',
            popover: '#050505',
            popoverForeground: '#ffffff',
            border: '#00D1FF',
            input: '#0D1117',
            ring: '#00D1FF',
            warning: '#FFB800',
            success: '#00FF41',
        },
    },
    light: {
        name: 'light',
        displayName: 'Light',
        colors: {
            background: '#ffffff',
            surface: '#f8fafc',
            foreground: '#0f172a',
            primary: '#0ea5e9',
            primaryForeground: '#ffffff',
            secondary: '#f1f5f9',
            secondaryForeground: '#0f172a',
            muted: '#f1f5f9',
            mutedForeground: '#64748b',
            accent: '#f1f5f9',
            accentForeground: '#0f172a',
            destructive: '#dc2626',
            destructiveForeground: '#ffffff',
            card: '#ffffff',
            cardForeground: '#0f172a',
            popover: '#ffffff',
            popoverForeground: '#0f172a',
            border: '#e2e8f0',
            input: '#f8fafc',
            ring: '#0ea5e9',
            warning: '#f59e0b',
            success: '#10b981',
        },
    },
    midnight: {
        name: 'midnight',
        displayName: 'Midnight',
        colors: {
            background: '#0a0e27',
            surface: '#151934',
            foreground: '#e0e7ff',
            primary: '#818cf8',
            primaryForeground: '#0a0e27',
            secondary: '#1e293b',
            secondaryForeground: '#e0e7ff',
            muted: '#1e293b',
            mutedForeground: '#94a3b8',
            accent: '#1e293b',
            accentForeground: '#e0e7ff',
            destructive: '#f87171',
            destructiveForeground: '#ffffff',
            card: '#0a0e27',
            cardForeground: '#e0e7ff',
            popover: '#0a0e27',
            popoverForeground: '#e0e7ff',
            border: '#4c1d95',
            input: '#151934',
            ring: '#818cf8',
            warning: '#fbbf24',
            success: '#34d399',
        },
    },
    nord: {
        name: 'nord',
        displayName: 'Nord',
        colors: {
            background: '#2e3440',
            surface: '#3b4252',
            foreground: '#eceff4',
            primary: '#88c0d0',
            primaryForeground: '#2e3440',
            secondary: '#4c566a',
            secondaryForeground: '#eceff4',
            muted: '#4c566a',
            mutedForeground: '#d8dee9',
            accent: '#5e81ac',
            accentForeground: '#eceff4',
            destructive: '#bf616a',
            destructiveForeground: '#eceff4',
            card: '#2e3440',
            cardForeground: '#eceff4',
            popover: '#2e3440',
            popoverForeground: '#eceff4',
            border: '#4c566a',
            input: '#3b4252',
            ring: '#88c0d0',
            warning: '#ebcb8b',
            success: '#a3be8c',
        },
    },
};

export const defaultTheme = 'nord';
