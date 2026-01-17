import { Monitor, Circle, ChevronsUpDown } from 'lucide-react';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
interface MachineSelectorProps {
    onClick: () => void;
}

export function MachineSelector({ onClick }: MachineSelectorProps) {
    const { machines, selectedMachine, isLoading, pendingMachines } = useMachine();

    if (isLoading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Scanning...</div>;
    }

    // Default trigger button content
    let triggerContent = (
        <>
            <div className="flex items-center gap-2 truncate">
                <Monitor size={16} className="shrink-0" />
                <span className="truncate">Select Machine...</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </>
    );

    if (machines.length > 0 && selectedMachine) {
        triggerContent = (
            <>
                <div className="flex items-center gap-2 truncate min-w-0">
                    <Monitor size={16} className="shrink-0" />
                    <span className="truncate font-medium hidden sm:inline">
                        {selectedMachine.displayName || selectedMachine.name}
                    </span>
                    <span className="truncate font-medium sm:hidden">
                        {(selectedMachine.displayName || selectedMachine.name).substring(0, 8)}...
                    </span>
                    <Circle
                        size={8}
                        className={cn(
                            "shrink-0",
                            selectedMachine.isOnline ? "fill-success text-success" : "fill-muted text-muted"
                        )}
                    />
                    {selectedMachine.status === 'archived' && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1 ml-1 hidden sm:inline-flex">Archived</Badge>
                    )}
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
        );
    } else if (machines.length === 0) {
        const hasPending = pendingMachines.length > 0;
        triggerContent = (
            <>
                <div className="flex items-center gap-2 truncate">
                    <Monitor size={16} className={cn("shrink-0", hasPending ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("truncate hidden sm:inline", hasPending ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {hasPending ? "Setup Required" : "No active machines"}
                    </span>
                </div>
            </>
        );
    }

    // Pass pendingMachines count if any
    const pendingCount = pendingMachines.length;

    return (
        <Button
            variant="outline"
            role="combobox"
            className={cn(
                "justify-between gap-2 w-auto sm:min-w-[200px] max-w-[160px] sm:max-w-[260px]",
                !selectedMachine && "text-muted-foreground"
            )}
            onClick={onClick}
        >
            <div className="flex-1 min-w-0 flex items-center">{triggerContent}</div>

            {pendingCount > 0 && (
                <div className="ml-1 sm:ml-2 flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold tracking-tight">
                        <span className="hidden sm:inline">PENDING </span>
                        {pendingCount}
                    </span>
                </div>
            )}
        </Button>
    );
}
