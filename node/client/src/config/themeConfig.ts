export interface Theme {
    name: string;
    displayName: string;
    order?: number;
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
    nord: {
        name: 'nord',
        displayName: 'Nord',
        order: 0,
        colors: {
            background: '#2e3440',
            surface: '#3b4252',
            foreground: '#d8dee9',
            primary: '#88c0d0',
            primaryForeground: '#2e3440',
            secondary: '#4c566a',
            secondaryForeground: '#eceff4',
            muted: '#434c5e',
            mutedForeground: '#98a5b9',
            accent: '#81a1c1',
            accentForeground: '#eceff4',
            destructive: '#bf616a',
            destructiveForeground: '#eceff4',
            card: '#3b4252',
            cardForeground: '#eceff4',
            popover: '#3b4252',
            popoverForeground: '#eceff4',
            border: '#4c566a',
            input: '#434c5e',
            ring: '#88c0d0',
            warning: '#ebcb8b', // Aurora Yellow
            success: '#a3be8c', // Aurora Green
        },
        style: {
            borderRadius: '0.5rem',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontWeight: '400',
            animationDuration: '200ms',
            animationTiming: 'ease-out',
            shadowStyle: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            buttonStyle: 'rounded',
        },
    },
    obsidian: {
        name: 'obsidian',
        displayName: 'Obsidian',
        order: 1,
        colors: {
            background: '#0b0c10', // Deepest Navy/Black
            surface: '#12141a', // Slightly lighter
            foreground: '#c5c6c7', // Soft Gray text
            primary: '#66fcf1', // Neon Cyan (Glow)
            primaryForeground: '#0b0c10',
            secondary: '#1f2833', // Deep Steel
            secondaryForeground: '#66fcf1',
            muted: '#1f2833',
            mutedForeground: '#7a8699',
            accent: '#45a29e', // Muted Teal
            accentForeground: '#ffffff',
            destructive: '#fc5185', // Neon Pink-Red
            destructiveForeground: '#ffffff',
            card: '#0F1218', // Distinct card bg
            cardForeground: '#c5c6c7',
            popover: '#12141a',
            popoverForeground: '#c5c6c7',
            border: '#1f2833',
            input: '#0b0c10',
            ring: '#66fcf1',
            warning: '#f4a261',
            success: '#2ec4b6',
        },
        style: {
            borderRadius: '0px', // Sharp edges
            fontFamily: "'JetBrains Mono', monospace", // Coding vibe
            fontWeight: '500',
            animationDuration: '150ms',
            animationTiming: 'linear',
            shadowStyle: '0 0 10px rgba(102, 252, 241, 0.1)', // Subtle glow
            buttonStyle: 'sharp',
        },
    },
    dawn: {
        name: 'dawn',
        displayName: 'Dawn',
        colors: {
            background: '#fffbf6', // Warm Morning White
            surface: '#ffffff',
            foreground: '#4c566a', // Nord Polar Night (Lighter)
            primary: '#5e81ac', // Nord Frost (Blue)
            primaryForeground: '#ffffff',
            secondary: '#eceff4', // Nord Snow Storm
            secondaryForeground: '#4c566a',
            muted: '#f4f6f9',
            mutedForeground: '#94a1b2',
            accent: '#88c0d0', // Nord Cyan
            accentForeground: '#ffffff',
            destructive: '#bf616a', // Nord Red
            destructiveForeground: '#ffffff',
            card: '#ffffff',
            cardForeground: '#4c566a',
            popover: '#ffffff',
            popoverForeground: '#4c566a',
            border: '#e5e9f0',
            input: '#fffbf6',
            ring: '#5e81ac',
            warning: '#ebcb8b',
            success: '#a3be8c',
        },
        style: {
            borderRadius: '0.5rem', // Soft rounded
            fontFamily: "'Inter', sans-serif",
            fontWeight: '400',
            animationDuration: '300ms', // Slower, calmer
            animationTiming: 'ease-in-out',
            shadowStyle: '0 4px 6px -1px rgb(0 0 0 / 0.05)', // Very soft shadow
            buttonStyle: 'rounded',
        },
    },
    slate: {
        name: 'slate',
        displayName: 'Slate',
        colors: {
            background: '#0f172a', // Slate 900
            surface: '#1e293b', // Slate 800
            foreground: '#f8fafc', // Slate 50
            primary: '#38bdf8', // Sky 400
            primaryForeground: '#0f172a',
            secondary: '#334155', // Slate 700
            secondaryForeground: '#f8fafc',
            muted: '#1e293b',
            mutedForeground: '#94a3b8', // Slate 400
            accent: '#0ea5e9', // Sky 500
            accentForeground: '#f8fafc',
            destructive: '#f43f5e', // Rose 500
            destructiveForeground: '#ffffff',
            card: '#1e293b',
            cardForeground: '#f8fafc',
            popover: '#1e293b',
            popoverForeground: '#f8fafc',
            border: '#334155',
            input: '#0f172a',
            ring: '#38bdf8',
            warning: '#fbbf24',
            success: '#4ade80',
        },
        style: {
            borderRadius: '0.75rem', // Soft rounded
            fontFamily: "'Inter', sans-serif",
            fontWeight: '400',
            animationDuration: '200ms',
            animationTiming: 'ease',
            shadowStyle: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            buttonStyle: 'rounded',
        },
    }
};

export const defaultTheme = 'nord';
