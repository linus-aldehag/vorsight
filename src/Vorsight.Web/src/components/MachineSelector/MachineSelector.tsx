import * as React from 'react';
import { Monitor, Circle, ChevronsUpDown, Archive, ArchiveRestore, Eye, EyeOff } from 'lucide-react';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";
import { VorsightApi } from '../../api/client';

export function MachineSelector() {
    const { machines, selectedMachine, selectMachine, isLoading, refreshMachines, showArchived, setShowArchived } = useMachine();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = React.useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);
    const [machineToArchive, setMachineToArchive] = React.useState<{ id: string; name: string; isArchived: boolean } | null>(null);

    const handleMachineClick = (machineId: string) => {
        selectMachine(machineId);
        navigate(`/${machineId}/dashboard`);
    };

    const handleArchiveClick = (machineId: string, displayName: string | null | undefined, machineName: string, isArchived: boolean) => {
        setMachineToArchive({ id: machineId, name: displayName || machineName, isArchived });
        setArchiveDialogOpen(true);
    };

    const handleArchiveConfirm = async () => {
        if (!machineToArchive) return;

        try {
            if (machineToArchive.isArchived) {
                await VorsightApi.unarchiveMachine(machineToArchive.id);
            } else {
                await VorsightApi.archiveMachine(machineToArchive.id);
            }
            refreshMachines();
        } catch (error) {
            console.error('Archive operation failed:', error);
        } finally {
            setArchiveDialogOpen(false);
            setMachineToArchive(null);
        }
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
                    <div className="flex justify-end pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowArchived(!showArchived)}
                            className="gap-2"
                        >
                            {showArchived ? <EyeOff size={16} /> : <Eye size={16} />}
                            {showArchived ? 'Hide Archived' : 'Show Archived'}
                        </Button>
                    </div>
                    <div className="flex flex-col gap-2 py-2 max-h-[60vh] overflow-y-auto">
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
                                                {machine.status === 'archived' && (
                                                    <Badge variant="secondary" className="ml-2 text-xs">Archived</Badge>
                                                )}
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
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveClick(machine.id, machine.displayName, machine.name, machine.status === 'archived');
                                    }}
                                    className="shrink-0 h-9 w-9"
                                    title={machine.status === 'archived' ? 'Un-archive machine' : 'Archive machine'}
                                >
                                    {machine.status === 'archived' ? (
                                        <ArchiveRestore size={16} />
                                    ) : (
                                        <Archive size={16} />
                                    )}
                                </Button>
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

            <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {machineToArchive?.isArchived ? 'Un-archive' : 'Archive'} Machine
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {machineToArchive?.isArchived ? (
                                <>
                                    Are you sure you want to un-archive <strong>{machineToArchive?.name}</strong>?
                                    <br /><br />
                                    This will resume data collection and make the machine visible in the main list.
                                </>
                            ) : (
                                <>
                                    Are you sure you want to archive <strong>{machineToArchive?.name}</strong>?
                                    <br /><br />
                                    This will stop all data collection but preserve historical data. The machine can be un-archived later.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchiveConfirm}>
                            {machineToArchive?.isArchived ? 'Un-archive' : 'Archive'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
