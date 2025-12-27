import { Monitor, Circle } from 'lucide-react';
import { useMachine } from '../../context/MachineContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EditableMachineName } from './EditableMachineName';

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
                className="flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-md cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => handleMachineClick(m.id)}
            >
                <Monitor size={16} className="text-primary" />
                <EditableMachineName
                    machineId={m.id}
                    displayName={m.displayName}
                    machineName={m.name}
                    onUpdate={refreshMachines}
                />
                <Circle
                    size={8}
                    className={m.isOnline ? "fill-success text-success" : "fill-muted text-muted"}
                />
            </div>
        );
    }

    // For multiple machines, use button group with display names
    return (
        <div className="flex bg-muted/50 p-1 rounded-lg gap-1">
            {machines.map(machine => (
                <Button
                    key={machine.id}
                    variant={selectedMachine?.id === machine.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleMachineClick(machine.id)}
                    className="h-8 gap-2"
                >
                    <Monitor size={14} />
                    {machine.displayName || machine.name}
                    <Circle
                        size={6}
                        className={machine.isOnline ? "fill-success text-success" : "fill-muted text-muted"}
                    />
                </Button>
            ))}
        </div>
    );
}
