import * as React from 'react';
import { Monitor, Circle, ChevronsUpDown } from 'lucide-react';
import { useMachine } from '../../context/MachineContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EditableMachineName } from './EditableMachineName';
import { cn } from '../../lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../ui/dialog";

export function MachineSelector() {
    const { machines, selectedMachine, selectMachine, isLoading, refreshMachines } = useMachine();
    const navigate = useNavigate();

    const handleMachineClick = (machineId: string) => {
        selectMachine(machineId);
        navigate(`/${machineId}/dashboard`);
    };

    if (isLoading) {
        return <div className="text-sm text-muted-foreground animate-pulse">Scanning network...</div>;
    }

    if (machines.length === 0) {
        return (
            <Badge variant="secondary" className="text-yellow-500 border-yellow-500/50">
                No signals detected
            </Badge>
        );
    }

    // For single machine, show with editable display name
    if (machines.length === 1) {
        const m = machines[0];
        return (
            <div
                className="flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-md cursor-pointer hover:bg-primary/10 transition-colors max-w-full"
                onClick={() => handleMachineClick(m.id)}
            >
                <Monitor size={16} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                    <EditableMachineName
                        machineId={m.id}
                        displayName={m.displayName}
                        machineName={m.name}
                        onUpdate={refreshMachines}
                        hideId={true}
                    />
                </div>
                <Circle
                    size={8}
                    className={cn(
                        "shrink-0",
                        m.isOnline ? "fill-success text-success" : "fill-muted text-muted"
                    )}
                />
            </div>
        );
    }

    // For multiple machines, use a Dialog-based switcher for better mobile capability
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                className="w-full justify-between gap-2 min-w-[200px] md:w-auto"
                onClick={() => setIsOpen(true)}
            >
                <div className="flex items-center gap-2 truncate">
                    <Monitor size={16} className="shrink-0" />
                    <span className="truncate">
                        {selectedMachine
                            ? (selectedMachine.displayName || selectedMachine.name)
                            : "Select Machine..."}
                    </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Switch Machine</DialogTitle>
                        <DialogDescription>
                            Select a machine from the list to view its dashboard. Click the pencil icon to edit a machine's display name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-4 max-h-[60vh] overflow-y-auto">
                        {machines.map((machine) => (
                            <div key={machine.id} className="flex items-center gap-1">
                                <Button
                                    variant={selectedMachine?.id === machine.id ? "secondary" : "ghost"}
                                    size="lg"
                                    onClick={() => {
                                        handleMachineClick(machine.id);
                                        setIsOpen(false);
                                    }}
                                    className="flex-1 justify-between h-auto py-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Monitor size={18} className="text-muted-foreground shrink-0" />
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="font-medium truncate w-full text-left">
                                                {machine.displayName || machine.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate w-full text-left">
                                                ID: {machine.name}
                                            </span>
                                        </div>
                                    </div>
                                    <Circle
                                        size={8}
                                        className={cn(
                                            "shrink-0",
                                            machine.isOnline ? "fill-success text-success" : "fill-muted text-muted"
                                        )}
                                    />
                                </Button>
                                <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                    <EditableMachineName
                                        machineId={machine.id}
                                        displayName={machine.displayName}
                                        machineName={machine.name}
                                        onUpdate={refreshMachines}
                                        hideId={true}
                                        className="[&>span]:hidden [&_button]:!opacity-100 [&_button]:h-9 [&_button]:w-9"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
