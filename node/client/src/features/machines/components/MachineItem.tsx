
import { useState } from 'react';
import { Monitor, MoreHorizontal, Pencil, Archive, ArchiveRestore, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Machine } from '@/context/MachineContext';

interface MachineItemProps {
    machine: Machine;
    isSelected: boolean;
    onSelect: (machine: Machine) => void;
    onRename: (id: string, newName: string) => Promise<void>;
    onArchive: (id: string) => Promise<void>;
    onUnarchive: (id: string) => Promise<void>;
}

export function MachineItem({
    machine,
    isSelected,
    onSelect,
    onRename,
    onArchive,
    onUnarchive
}: MachineItemProps) {
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(machine.displayName || machine.name);
    const [isSaving, setIsSaving] = useState(false);

    const handleRenameSubmit = async () => {
        if (!newName.trim() || newName === (machine.displayName || machine.name)) {
            setIsRenaming(false);
            return;
        }

        try {
            setIsSaving(true);
            await onRename(machine.id, newName);
            setIsRenaming(false);
        } catch (error) {
            console.error('Failed to rename machine', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleArchiveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (machine.status === 'archived') {
                await onUnarchive(machine.id);
            } else {
                await onArchive(machine.id);
            }
        } catch (error) {
            console.error('Failed to toggle archive status', error);
        }
    };

    if (isRenaming) {
        return (
            <div className="flex items-center gap-2 p-2 rounded-md border border-primary/20 bg-primary/5">
                <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                    className="h-8 text-sm"
                    disabled={isSaving}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit();
                        if (e.key === 'Escape') setIsRenaming(false);
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <Button size="sm" variant="ghost" onClick={handleRenameSubmit} disabled={isSaving} className="h-8 w-8 p-0">
                    <span className="sr-only">Save</span>
                    ✓
                </Button>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                isSelected
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-transparent hover:border-border hover:bg-accent/50",
                machine.status === 'archived' && "opacity-60 bg-muted/30"
            )}
            onClick={() => onSelect(machine)}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                    "p-2 rounded-full",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    machine.status === 'archived' && "bg-muted/50"
                )}>
                    <Monitor size={18} />
                </div>

                <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate text-sm">
                        {machine.displayName || machine.name}
                    </span>
                    <span className="text-xs text-muted-foreground truncate font-mono">
                        {machine.hostname || machine.id}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {machine.status !== 'archived' && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 border border-border/50">
                        <Circle
                            size={6}
                            className={cn(
                                "fill-current",
                                machine.isOnline ? "text-emerald-500" : "text-muted-foreground"
                            )}
                        />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            {machine.connectionStatus}
                        </span>
                    </div>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                        >
                            <MoreHorizontal size={16} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            e.stopPropagation();
                            setIsRenaming(true);
                        }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={handleArchiveToggle}
                            className={machine.status === 'archived' ? "text-emerald-600 focus:text-emerald-600" : "text-amber-600 focus:text-amber-600"}
                        >
                            {machine.status === 'archived' ? (
                                <>
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    Unarchive
                                </>
                            ) : (
                                <>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                </>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
