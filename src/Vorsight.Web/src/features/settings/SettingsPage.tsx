import { Card } from '../../components/ui/card';
import { useTheme } from '../../context/ThemeContext';
import { GoogleDriveConnection } from '../dashboard/GoogleDriveConnection';
import { Palette, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function SettingsPage() {
    const { currentTheme, setTheme, availableThemes } = useTheme();

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold tracking-tight">Settings</h3>
            </div>

            <div className="space-y-6">
                {/* Theme Selector */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                <Palette size={16} className="text-primary" />
                                Theme
                            </h3>
                            <p className="text-sm text-muted-foreground">Choose your color scheme (applies immediately)</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {availableThemes
                                .sort((a, b) => a.displayName.localeCompare(b.displayName))
                                .map((theme) => {
                                    const isActive = theme.name === currentTheme;

                                    return (
                                        <button
                                            key={theme.name}
                                            onClick={() => setTheme(theme.name)}
                                            className={cn(
                                                "relative p-4 rounded border-2 transition-all duration-200 hover:scale-105",
                                                isActive
                                                    ? "border-primary bg-primary/10"
                                                    : "border-white/10 hover:border-white/20 bg-background/50"
                                            )}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex gap-1.5 mb-2">
                                                    <div
                                                        className="w-full h-8 rounded border border-white/20"
                                                        style={{ backgroundColor: theme.colors.primary }}
                                                    />
                                                    <div
                                                        className="w-full h-8 rounded border border-white/20"
                                                        style={{ backgroundColor: theme.colors.background }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className={cn(
                                                        "text-sm font-medium",
                                                        isActive && "text-primary"
                                                    )}>
                                                        {theme.displayName}
                                                    </span>
                                                    {isActive && (
                                                        <Check size={16} className="text-primary" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </Card>

                {/* Google Drive Connection */}
                <div className="max-w-md">
                    <GoogleDriveConnection />
                </div>
            </div>

            {/* Version Info */}
            <div className="flex justify-center">
                <p className="text-xs text-muted-foreground">
                    Vörsight Web v{__APP_VERSION__}
                </p>
            </div>
        </div>
    );
}
