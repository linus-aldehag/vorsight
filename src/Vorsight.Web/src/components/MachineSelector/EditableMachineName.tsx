import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

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
}

export function EditableMachineName({
    machineId,
    displayName,
    machineName,
    onUpdate,
    className = ''
}: EditableMachineNameProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(displayName || '');
    const [isSaving, setIsSaving] = useState(false);

    const effectiveName = displayName || machineName;

    const handleEdit = () => {
        setEditValue(displayName || '');
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditValue(displayName || '');
        setIsEditing(false);
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

            setIsEditing(false);
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

    if (isEditing) {
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
                {!displayName && (
                    <span className="text-xs text-muted-foreground">
                        (ID: {machineName})
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 group ${className}`}>
            <span className="text-sm font-medium tracking-wide">{effectiveName}</span>
            <Button
                size="sm"
                variant="ghost"
                onClick={handleEdit}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Pencil className="h-3 w-3" />
            </Button>
            {displayName && (
                <span className="text-xs text-muted-foreground">
                    (ID: {machineName})
                </span>
            )}
        </div>
    );
}
