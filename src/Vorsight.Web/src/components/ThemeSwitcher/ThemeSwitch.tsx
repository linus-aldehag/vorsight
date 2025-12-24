import { useTheme } from '../../context/ThemeContext';
import { Button } from '../ui/button';
import { Palette, Check } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export function ThemeSwitch() {
    const { currentTheme, setTheme, availableThemes } = useTheme();
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="gap-2">
                    <Palette size={18} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Palette size={20} className="text-primary" />
                        Theme
                    </DialogTitle>
                    <DialogDescription>
                        Choose your color scheme (applies immediately)
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-4">
                    {availableThemes
                        .sort((a, b) => a.displayName.localeCompare(b.displayName))
                        .map((theme) => {
                            const isActive = theme.name === currentTheme;

                            return (
                                <button
                                    key={theme.name}
                                    onClick={() => {
                                        setTheme(theme.name);
                                        setOpen(false);
                                    }}
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
            </DialogContent>
        </Dialog>
    );
}
