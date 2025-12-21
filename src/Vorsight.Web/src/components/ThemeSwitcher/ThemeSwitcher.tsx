import { Palette } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export function ThemeSwitcher() {
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const currentThemeData = availableThemes.find(t => t.name === currentTheme);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-white/10 hover:border-primary/50 bg-surface/50 hover:bg-surface transition-all duration-200"
                aria-label="Switch theme"
            >
                <Palette size={16} className="text-primary" />
                <span className="text-sm font-medium tracking-wide">{currentThemeData?.displayName}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-white/10 rounded shadow-xl z-50 overflow-hidden">
                    <div className="p-2 space-y-1">
                        {availableThemes.map((theme) => {
                            const isActive = theme.name === currentTheme;

                            return (
                                <button
                                    key={theme.name}
                                    onClick={() => {
                                        setTheme(theme.name);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded transition-all duration-200",
                                        isActive
                                            ? "bg-primary/10 border border-primary/20"
                                            : "hover:bg-white/5 border border-transparent"
                                    )}
                                >
                                    <div className="flex gap-1">
                                        <div
                                            className="w-3 h-3 rounded-sm border border-white/20"
                                            style={{ backgroundColor: theme.colors.primary }}
                                        />
                                        <div
                                            className="w-3 h-3 rounded-sm border border-white/20"
                                            style={{ backgroundColor: theme.colors.background }}
                                        />
                                    </div>
                                    <span className={cn(
                                        "text-sm font-medium tracking-wide flex-1 text-left",
                                        isActive && "text-primary"
                                    )}>
                                        {theme.displayName}
                                    </span>
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
