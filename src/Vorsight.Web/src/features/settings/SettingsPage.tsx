import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useMachine } from '../../context/MachineContext';
import { GoogleDriveConnection } from '../dashboard/GoogleDriveConnection';
import { DataRetention } from './DataRetention';
import { Palette, Check, Settings, Sliders } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import { FeaturesPage } from './FeaturesPage';

export function SettingsPage() {
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const { timeFormat, setTimeFormat } = useSettings();
    const { selectedMachine } = useMachine();
    const [showFeatures, setShowFeatures] = useState(false);

    // If showing features page, render that instead
    if (showFeatures) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFeatures(false)}
                    >
                        ← Back to Settings
                    </Button>
                </div>
                <FeaturesPage />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold tracking-tight">Settings</h3>
            </div>

            <div className="space-y-6">
                {/* Features Management - Only show if machine is selected */}
                {selectedMachine && (
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <Sliders size={16} className="text-primary" />
                                    Features & Modules
                                </h3>
                                <p className="text-sm text-muted-foreground">Manage monitoring features for {selectedMachine.name}</p>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => setShowFeatures(true)}
                            >
                                Manage Features
                            </Button>
                        </div>
                    </Card>
                )}
                {/* Preferences */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                                <Settings size={16} className="text-primary" />
                                Preferences
                            </h3>
                            <p className="text-sm text-muted-foreground">Customize your interface experience</p>
                        </div>

                        <div className="grid gap-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h4 className="font-medium text-sm">Time Format</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Choose how times are displayed across the application
                                    </p>
                                </div>
                                <div className="flex bg-muted p-1 rounded-lg">
                                    <button
                                        onClick={() => setTimeFormat('12h')}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                            timeFormat === '12h'
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        12-hour
                                    </button>
                                    <button
                                        onClick={() => setTimeFormat('24h')}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                            timeFormat === '24h'
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        24-hour
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

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

                {/* Data Retention */}
                <DataRetention />
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
