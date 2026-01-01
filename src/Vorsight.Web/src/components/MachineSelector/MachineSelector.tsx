import { Monitor, Circle } from 'lucide-react';
import { useMachine } from '../../context/MachineContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EditableMachineName } from './EditableMachineName';
import { cn } from '../../lib/utils';

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

    // For multiple machines, use button group with display names
    return (
        <div className="flex bg-muted/50 p-1 rounded-lg gap-1 max-w-full overflow-x-auto">
            {machines.map(machine => (
                <Button
                    key={machine.id}
                    variant={selectedMachine?.id === machine.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleMachineClick(machine.id)}
                    className="h-8 gap-2 shrink-0"
                >
                    <Monitor size={14} />
                    <span className="truncate max-w-[120px]">{machine.displayName || machine.name}</span>
                    <Circle
                        size={6}
                        className={machine.isOnline ? "fill-success text-success" : "fill-muted text-muted"}
                    />
                </Button>
            ))}
        </div>
    );
}
