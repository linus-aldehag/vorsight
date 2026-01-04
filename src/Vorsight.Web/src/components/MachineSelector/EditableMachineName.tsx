import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../ui/dialog";

// Helper to get authorization headers
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

interface EditableMachineNameProps {
    machineId: string;
    displayName?: string | null;
    machineName: string;
    onUpdate?: (displayName: string | null) => void;
    className?: string;
    hideId?: boolean; // Hide the machine ID even when a display name is set
}

export function EditableMachineName({
    machineId,
    displayName,
    machineName,
    onUpdate,
    className = '',
    hideId = false
}: EditableMachineNameProps) {
    const [isInlineEditing, setIsInlineEditing] = useState(false);
    const [isDialogEditing, setIsDialogEditing] = useState(false);
    const [editValue, setEditValue] = useState(displayName || '');
    const [isSaving, setIsSaving] = useState(false);

    const effectiveName = displayName || machineName;

    const handleEditClick = () => {
        setEditValue(displayName || '');
        // Check for desktop breakpoint (md: 768px in standard Tailwind)
        if (window.matchMedia('(min-width: 768px)').matches) {
            setIsInlineEditing(true);
        } else {
            setIsDialogEditing(true);
        }
    };

    const handleCancel = () => {
        setEditValue(displayName || '');
        setIsInlineEditing(false);
        setIsDialogEditing(false);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const newDisplayName = editValue.trim() || null;

            const response = await fetch(`/api/machines/${machineId}/display-name`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders(),
                },
                body: JSON.stringify({ displayName: newDisplayName }),
            });

            if (!response.ok) {
                throw new Error('Failed to update display name');
            }

            const data = await response.json();

            setIsInlineEditing(false);
            setIsDialogEditing(false);
            onUpdate?.(data.displayName);
        } catch (error) {
            console.error('Error updating display name:', error);
            alert('Failed to update display name');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    // Inline Editing View (Desktop)
    if (isInlineEditing) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={machineName}
                    className="h-8 flex-1 min-w-[200px]"
                    autoFocus
                    disabled={isSaving}
                />
                <div className="flex items-center gap-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                    >
                        <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            </div>
        );
    }

    // Default View (Read-only with trigger)
    return (
        <>
            <div className={`flex items-center gap-2 group ${className}`}>
                <span className="text-sm font-medium tracking-wide truncate max-w-[150px] md:max-w-none">{effectiveName}</span>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleEditClick}
                    className="h-6 w-6 opacity-70 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit display name"
                >
                    <Pencil className="h-3 w-3" />
                </Button>
                {displayName && !hideId && (
                    <span className="text-xs text-muted-foreground hidden md:inline">
                        (ID: {machineName})
                    </span>
                )}
            </div>

            <Dialog open={isDialogEditing} onOpenChange={setIsDialogEditing}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Machine Name</DialogTitle>
                        <DialogDescription>
                            Enter a friendly name for this machine to make it easier to identify.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <span className="text-sm text-muted-foreground">Original Name (ID): {machineName}</span>
                            <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="Enter a friendly display name"
                                disabled={isSaving}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogEditing(false)} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
