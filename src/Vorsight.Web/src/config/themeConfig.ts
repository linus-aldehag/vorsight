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
    style: {
        borderRadius: string;
        fontFamily: string;
        fontWeight: string;
        animationDuration: string;
        animationTiming: string;
        shadowStyle: string;
        buttonStyle: 'sharp' | 'rounded' | 'pill';
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
        style: {
            borderRadius: '0px',
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
            fontWeight: '500',
            animationDuration: '100ms',
            animationTiming: 'linear',
            shadowStyle: 'none',
            buttonStyle: 'sharp',
        },
    },
    light: {
        name: 'light',
        displayName: 'Light',
        colors: {
            background: '#f0f2f5', // Softer, more gray
            surface: '#e5e9ed', // Muted gray-blue
            foreground: '#2d3748', // Warmer dark gray
            primary: '#0ea5e9',
            primaryForeground: '#ffffff',
            secondary: '#dfe3e8', // Softer gray
            secondaryForeground: '#4a5568',
            muted: '#d9dfe5',
            mutedForeground: '#64748b',
            accent: '#dfe3e8',
            accentForeground: '#2d3748',
            destructive: '#dc2626',
            destructiveForeground: '#ffffff',
            card: '#f8f9fa', // Soft off-white for cards
            cardForeground: '#2d3748',
            popover: '#f8f9fa',
            popoverForeground: '#2d3748',
            border: '#cbd5e0',
            input: '#e5e9ed',
            ring: '#0ea5e9',
            warning: '#f59e0b',
            success: '#10b981',
        },
        style: {
            borderRadius: '12px',
            fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: '400',
            animationDuration: '200ms',
            animationTiming: 'ease-out',
            shadowStyle: 'lg', // Borrowed from Material Light
            buttonStyle: 'rounded',
        },
    },
    midnight: {
        name: 'midnight',
        displayName: 'Midnight',
        colors: {
            background: '#121212',
            surface: '#1e1e1e',
            foreground: '#e0e0e0',
            primary: '#bb86fc',
            primaryForeground: '#000000',
            secondary: '#03dac6',
            secondaryForeground: '#000000',
            muted: '#2c2c2c',
            mutedForeground: '#9e9e9e',
            accent: '#03dac6',
            accentForeground: '#000000',
            destructive: '#cf6679',
            destructiveForeground: '#000000',
            card: '#1e1e1e',
            cardForeground: '#e0e0e0',
            popover: '#2c2c2c',
            popoverForeground: '#e0e0e0',
            border: '#383838',
            input: '#2c2c2c',
            ring: '#bb86fc',
            warning: '#ffb74d',
            success: '#81c784',
        },
        style: {
            borderRadius: '4px',
            fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif",
            fontWeight: '400',
            animationDuration: '250ms',
            animationTiming: 'cubic-bezier(0.4, 0, 0.2, 1)',
            shadowStyle: 'lg',
            buttonStyle: 'rounded',
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
        style: {
            borderRadius: '8px',
            fontFamily: "'IBM Plex Sans', 'Roboto', 'Helvetica Neue', sans-serif",
            fontWeight: '400',
            animationDuration: '200ms',
            animationTiming: 'ease-in-out',
            shadowStyle: 'sm',
            buttonStyle: 'rounded',
        },
    },
};

export const defaultTheme = 'nord';
