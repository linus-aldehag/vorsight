import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { socketService } from '../services/socket';

// Helper to get authorization headers
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

export interface Machine {
    id: string;
    name: string;
    displayName?: string | null;
    hostname: string | null;
    isOnline: boolean;
    connectionStatus: 'online' | 'unstable' | 'offline';
    lastSeen: string | null;
}

interface MachineContextType {
    machines: Machine[];
    selectedMachine: Machine | null;
    selectMachine: (machineId: string) => void;
    refreshMachines: () => void;
    isLoading: boolean;
}

const MachineContext = createContext<MachineContextType | undefined>(undefined);

export function MachineProvider({ children }: { children: ReactNode }) {
    const [machines, setMachines] = useState<Machine[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Connect to WebSocket
        socketService.connect();

        // Handler for machines list (initial + updates)
        const handleMachinesList = (machinesList: Machine[]) => {
            setMachines(machinesList);

            // Update selected machine if it's in the new list
            if (selectedMachine) {
                const updatedMachine = machinesList.find(m => m.id === selectedMachine.id);
                if (updatedMachine) {
                    setSelectedMachine(updatedMachine);
                }
            } else if (machinesList.length > 0) {
                // Auto-select first machine if none selected
                setSelectedMachine(machinesList[0]);
            }
            setIsLoading(false);
        };

        // Handler for machine coming online
        const handleMachineOnline = ({ machineId }: { machineId: string }) => {
            setMachines(prev => {
                // Update existing machine or fetch fresh list
                const exists = prev.some(m => m.id === machineId);
                if (exists) {
                    return prev.map(m =>
                        m.id === machineId
                            ? { ...m, isOnline: true, lastSeen: new Date().toISOString() }
                            : m
                    );
                }
                // New machine - request full list
                socketService.emit('web:subscribe');
                return prev;
            });
        };

        // Handler for machine going offline
        const handleMachineOffline = ({ machineId }: { machineId: string }) => {
            setMachines(prev => prev.map(m =>
                m.id === machineId
                    ? { ...m, isOnline: false, lastSeen: new Date().toISOString() }
                    : m
            ));
        };

        // Handler for socket connection
        const handleConnect = () => {
            socketService.emit('web:subscribe');
        };

        // Subscribe to events
        socketService.on('connect', handleConnect);
        socketService.on('machines:list', handleMachinesList);
        socketService.on('machine:online', handleMachineOnline);
        socketService.on('machine:offline', handleMachineOffline);

        // Request machines list if already connected
        if (socketService.isConnected) {
            socketService.emit('web:subscribe');
        }

        // Fallback: also do initial HTTP fetch in case socket isn't ready
        fetch('/api/machines', { headers: getAuthHeaders() })
            .then(res => res.json())
            .then((data: Machine[]) => {
                if (machines.length === 0) {
                    handleMachinesList(data);
                }
            })
            .catch(err => {
                console.error('Failed to fetch machines via HTTP:', err);
                setIsLoading(false);
            });

        // Periodic refresh to recalculate time-based connection status
        // This allows online → unstable → offline transitions to happen automatically
        const refreshInterval = setInterval(() => {
            if (socketService.isConnected) {
                socketService.emit('web:subscribe');
            }
        }, 10000); // Refresh every 10 seconds

        // Cleanup
        return () => {
            socketService.off('connect', handleConnect);
            socketService.off('machines:list', handleMachinesList);
            socketService.off('machine:online', handleMachineOnline);
            socketService.off('machine:offline', handleMachineOffline);
            clearInterval(refreshInterval);
        };
    }, []); // Only run once on mount

    const selectMachine = (machineId: string) => {
        const machine = machines.find(m => m.id === machineId);
        if (machine) {
            setSelectedMachine(machine);
        }
    };

    const refreshMachines = () => {
        if (socketService.isConnected) {
            socketService.emit('web:subscribe');
        } else {
            // Fallback to HTTP if socket not connected
            fetch('/api/machines', { headers: getAuthHeaders() })
                .then(res => res.json())
                .then((data: Machine[]) => setMachines(data))
                .catch(err => console.error('Failed to refresh machines:', err));
        }
    };

    return (
        <MachineContext.Provider value={{ machines, selectedMachine, selectMachine, refreshMachines, isLoading }}>
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
