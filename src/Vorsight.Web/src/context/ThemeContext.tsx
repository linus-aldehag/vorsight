import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { themes, defaultTheme, type Theme } from '../config/themeConfig';

interface ThemeContextType {
    currentTheme: string;
    theme: Theme;
    setTheme: (themeName: string) => void;
    availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [currentTheme, setCurrentTheme] = useState<string>(() => {
        // Load theme from localStorage or use default
        const savedTheme = localStorage.getItem('vorsight-theme');
        return savedTheme && themes[savedTheme] ? savedTheme : defaultTheme;
    });

    const theme = themes[currentTheme];
    const availableThemes = Object.values(themes);

    const setTheme = (themeName: string) => {
        if (themes[themeName]) {
            setCurrentTheme(themeName);
            localStorage.setItem('vorsight-theme', themeName);
        }
    };

    // Apply theme colors to CSS variables
    useEffect(() => {
        const root = document.documentElement;
        const colors = theme.colors;

        // Apply all color variables
        root.style.setProperty('--color-background', colors.background);
        root.style.setProperty('--color-surface', colors.surface);
        root.style.setProperty('--color-foreground', colors.foreground);
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-primary-foreground', colors.primaryForeground);
        root.style.setProperty('--color-secondary', colors.secondary);
        root.style.setProperty('--color-secondary-foreground', colors.secondaryForeground);
        root.style.setProperty('--color-muted', colors.muted);
        root.style.setProperty('--color-muted-foreground', colors.mutedForeground);
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-accent-foreground', colors.accentForeground);
        root.style.setProperty('--color-destructive', colors.destructive);
        root.style.setProperty('--color-destructive-foreground', colors.destructiveForeground);
        root.style.setProperty('--color-card', colors.card);
        root.style.setProperty('--color-card-foreground', colors.cardForeground);
        root.style.setProperty('--color-popover', colors.popover);
        root.style.setProperty('--color-popover-foreground', colors.popoverForeground);
        root.style.setProperty('--color-border', colors.border);
        root.style.setProperty('--color-input', colors.input);
        root.style.setProperty('--color-ring', colors.ring);
        root.style.setProperty('--color-warning', colors.warning);
        root.style.setProperty('--color-success', colors.success);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ currentTheme, theme, setTheme, availableThemes }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
