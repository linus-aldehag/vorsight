import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface Machine {
    id: string;
    name: string;
    hostname: string | null;
    isOnline: boolean;
    lastSeen: string | null;
}

interface MachineContextType {
    machines: Machine[];
    selectedMachine: Machine | null;
    selectMachine: (machineId: string) => void;
    isLoading: boolean;
}

const MachineContext = createContext<MachineContextType | undefined>(undefined);

export function MachineProvider({ children }: { children: ReactNode }) {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch machines from API
        fetch('/api/machines')
            .then(res => res.json())
            .then((data: Machine[]) => {
                setMachines(data);
                // Auto-select first machine
                if (data.length > 0 && !selectedMachine) {
                    setSelectedMachine(data[0]);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch machines:', err);
                setIsLoading(false);
            });
    }, []);

    const selectMachine = (machineId: string) => {
        const machine = machines.find(m => m.id === machineId);
        if (machine) {
            setSelectedMachine(machine);
        }
    };

    return (
        <MachineContext.Provider value={{ machines, selectedMachine, selectMachine, isLoading }}>
            {children}
        </MachineContext.Provider>
    );
}

export function useMachine() {
    const context = useContext(MachineContext);
    if (!context) {
        throw new Error('useMachine must be used within MachineProvider');
    }
    return context;
}
