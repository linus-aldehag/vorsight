import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

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
    ipAddress?: string | null;
    isOnline: boolean;
    connectionStatus: 'online' | 'unstable' | 'offline' | 'reachable';
    pingStatus?: string | null;
    statusText?: string;
    lastSeen: string | null;
    status?: 'pending' | 'active' | 'archived';
}

interface MachineContextType {
    machines: Machine[];
    pendingMachines: Machine[];
    selectedMachine: Machine | null;
    selectMachine: (machineId: string) => void;
    refreshMachines: () => void;
    isLoading: boolean;
    onMachineDiscovered?: (callback: (machine: Machine) => void) => void;
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
}

const MachineContext = createContext<MachineContextType | undefined>(undefined);

export function MachineProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [machines, setMachines] = useState<Machine[]>([]);
    const [pendingMachines, setPendingMachines] = useState<Machine[]>([]);
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const selectedMachineRef = useRef<Machine | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const discoveryCallbackRef = useRef<((machine: Machine) => void) | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        selectedMachineRef.current = selectedMachine;
    }, [selectedMachine]);

    useEffect(() => {
        if (!isAuthenticated) {
            socketService.disconnect();
            return; // Don't fetch or connect if not authenticated
        }

        // Connect to WebSocket for real-time updates
        // In development, connect to backend server from env var
        // In production, backend and frontend are same server (window.location.origin)
        const socketUrl = import.meta.env.DEV
            ? (import.meta.env.VITE_API_URL || 'http://localhost:3000')
            : window.location.origin;
        socketService.connect(socketUrl);

        // Handler for machines list (initial + updates)
        const handleMachinesList = (machinesList: Machine[]) => {
            const currentSelected = selectedMachineRef.current;

            // Separate active, archived, and pending machines
            let activeMachines = machinesList.filter(m => m.status !== 'pending');

            // Filter out archived machines unless showArchived is true
            if (!showArchived) {
                activeMachines = activeMachines.filter(m => m.status !== 'archived');
            }

            const pending = machinesList.filter(m => m.status === 'pending');

            setMachines(activeMachines);
            setPendingMachines(pending);

            // Update selected machine if it's in the new list
            if (currentSelected) {
                const updatedMachine = activeMachines.find(m => m.id === currentSelected.id);
                if (updatedMachine) {
                    // Only update if something actually changed to avoid breaking React.memo
                    const hasChanged = JSON.stringify(updatedMachine) !== JSON.stringify(currentSelected);
                    if (hasChanged) {
                        setSelectedMachine(updatedMachine);
                    }
                }
            } else if (activeMachines.length > 0) {
                // Auto-select first machine if none selected
                setSelectedMachine(activeMachines[0]);
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

        // Handler for machine discovery
        const handleMachineDiscovered = (data: { machineId: string; name: string; hostname: string }) => {
            console.log('🔍 Machine discovered:', data);
            // Request fresh machine list
            socketService.emit('web:subscribe');
            // Call discovery callback if set
            if (discoveryCallbackRef.current) {
                discoveryCallbackRef.current({
                    id: data.machineId,
                    name: data.name,
                    hostname: data.hostname,
                    isOnline: false,
                    status: 'pending',
                    lastSeen: null,
                    connectionStatus: 'offline'
                });
            }
        };

        // Subscribe to events
        socketService.on('connect', handleConnect);
        socketService.on('machines:list', handleMachinesList);
        socketService.on('machine:online', handleMachineOnline);
        socketService.on('machine:offline', handleMachineOffline);
        socketService.on('machine:discovered', handleMachineDiscovered);

        // Don't emit here - wait for connection event
        // The handleConnect function will emit when socket connects

        // Fallback: also do initial HTTP fetch in case socket isn't ready
        const includeArchivedParam = showArchived ? '?includeArchived=true' : '';
        fetch(`/api/machines${includeArchivedParam}`, { headers: getAuthHeaders() })
            .then(res => res.json())
            .then((data: Machine[]) => {
                handleMachinesList(data);
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
            socketService.off('machine:discovered', handleMachineDiscovered);
            clearInterval(refreshInterval);
        };
    }, [showArchived, isAuthenticated]); // Re-run when showArchived changes

    // Trigger refresh when showArchived changes
    useEffect(() => {
        refreshMachines();
    }, [showArchived]);

    const onMachineDiscovered = (callback: (machine: Machine) => void) => {
        discoveryCallbackRef.current = callback;
    };

    const selectMachine = (machineId: string) => {
        const machine = machines.find(m => m.id === machineId);
        if (machine) {
            setSelectedMachine(machine);
        }
    };

    const refreshMachines = () => {
        if (!isAuthenticated) return;

        if (socketService.isConnected) {
            socketService.emit('web:subscribe');
        } else {
            // Fallback to HTTP if socket not connected
            const includeArchivedParam = showArchived ? '?includeArchived=true' : '';
            fetch(`/api/machines${includeArchivedParam}`, { headers: getAuthHeaders() })
                .then(res => res.json())
                .then((data: Machine[]) => setMachines(data))
                .catch(err => console.error('Failed to refresh machines:', err));
        }
    };

    return (
        <MachineContext.Provider value={{
            machines,
            pendingMachines,
            selectedMachine,
            selectMachine,
            refreshMachines,
            isLoading,
            onMachineDiscovered,
            showArchived,
            setShowArchived
        }}>
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
