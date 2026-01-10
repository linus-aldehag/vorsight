
import { useState, useMemo } from 'react';
import {
    Search
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMachine } from '@/context/MachineContext';
import { MachineItem } from './components/MachineItem';
import { PendingMachineItem } from './components/PendingMachineItem';
import { VorsightApi } from '@/api/client';
import type { Machine } from '@/context/MachineContext';

interface MachineManagerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: 'active' | 'pending' | 'archived';
}

export function MachineManager({ open, onOpenChange, defaultTab = 'active' }: MachineManagerProps) {
    const {
        machines,
        pendingMachines,
        selectedMachine,
        selectMachine,
        refreshMachines,
        showArchived,
        setShowArchived
    } = useMachine();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<string>(defaultTab);

    // Filter logic
    const filteredPending = useMemo(() => {
        if (!searchQuery) return pendingMachines;
        const q = searchQuery.toLowerCase();
        return pendingMachines.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.hostname && m.hostname.toLowerCase().includes(q))
        );
    }, [pendingMachines, searchQuery]);

    const activeMachines = useMemo(() =>
        machines.filter(m => m.status !== 'archived' && m.status !== 'pending'),
        [machines]);

    const archivedMachines = useMemo(() =>
        machines.filter(m => m.status === 'archived'),
        [machines]);

    const filteredActive = useMemo(() => {
        if (!searchQuery) return activeMachines;
        const q = searchQuery.toLowerCase();
        return activeMachines.filter(m =>
            (m.displayName && m.displayName.toLowerCase().includes(q)) ||
            m.name.toLowerCase().includes(q) ||
            (m.hostname && m.hostname.toLowerCase().includes(q))
        );
    }, [activeMachines, searchQuery]);

    const filteredArchived = useMemo(() => {
        if (!searchQuery) return archivedMachines;
        const q = searchQuery.toLowerCase();
        return archivedMachines.filter(m =>
            (m.displayName && m.displayName.toLowerCase().includes(q)) ||
            m.name.toLowerCase().includes(q) ||
            (m.hostname && m.hostname.toLowerCase().includes(q))
        );
    }, [archivedMachines, searchQuery]);

    // Actions
    const handleRename = async (id: string, newName: string) => {
        await VorsightApi.updateMachineDisplayName(id, newName);
        refreshMachines();
    };

    const handleArchive = async (id: string) => {
        await VorsightApi.archiveMachine(id);
        refreshMachines();
    };

    const handleUnarchive = async (id: string) => {
        await VorsightApi.unarchiveMachine(id);
        refreshMachines();
    };

    const handleAdopt = async (id: string, options: any) => {
        await VorsightApi.adoptMachine(id, options);
        refreshMachines();
        // If it was the only pending machine, switch to active tab
        if (pendingMachines.length === 1) {
            setActiveTab('active');
        }
    };

    const handleSelect = (machine: Machine) => {
        if (machine.status === 'archived') return; // Cannot select archived machines directly usually, or maybe we allow it?
        // Assuming we allow viewing archived machines if "Show Archived" is on, but here we separate them.
        // If viewing archived machine, we might need to enable read-only mode?
        // For now, allow selection for both active and archived if visible.
        selectMachine(machine.id);
        onOpenChange(false);
    };

    // Ensure we load archived machines if we tab to it
    const handleTabChange = (val: string) => {
        setActiveTab(val);
        if (val === 'archived' && !showArchived) {
            setShowArchived(true);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl">Machines</DialogTitle>
                            <DialogDescription>
                                Manage your connected devices
                            </DialogDescription>
                        </div>
                        {/* Future Add Button */}
                        {/* <Button size="sm" variant="outline" className="gap-2">
                            <Plus size={16} />
                            Add Manual
                        </Button> */}
                    </div>

                    <div className="mt-4 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search machines..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                        <div className="px-6 pt-2 border-b">
                            <TabsList className="w-full justify-start bg-transparent p-0 h-auto gap-4">
                                <TabsTrigger
                                    value="active"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1"
                                >
                                    Active
                                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">{activeMachines.length}</Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="pending"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1"
                                >
                                    Pending
                                    {pendingMachines.length > 0 && (
                                        <Badge className="ml-2 h-5 min-w-5 px-1 bg-primary text-primary-foreground">{pendingMachines.length}</Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="archived"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1"
                                >
                                    Archived
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <TabsContent value="active" className="mt-0 space-y-2">
                                    {filteredActive.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            {searchQuery ? 'No machines found matching your search.' : 'No active machines.'}
                                        </div>
                                    ) : (
                                        filteredActive.map(machine => (
                                            <MachineItem
                                                key={machine.id}
                                                machine={machine}
                                                isSelected={selectedMachine?.id === machine.id}
                                                onSelect={handleSelect}
                                                onRename={handleRename}
                                                onArchive={handleArchive}
                                                onUnarchive={handleUnarchive}
                                            />
                                        ))
                                    )}
                                </TabsContent>

                                <TabsContent value="pending" className="mt-0 space-y-4">
                                    {filteredPending.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            {searchQuery ? 'No pending machines found.' : 'No pending machines available.'}
                                        </div>
                                    ) : (
                                        filteredPending.map(machine => (
                                            <PendingMachineItem
                                                key={machine.id}
                                                machine={machine}
                                                onAdopt={handleAdopt}
                                            />
                                        ))
                                    )}
                                </TabsContent>

                                <TabsContent value="archived" className="mt-0 space-y-2">
                                    {filteredArchived.length === 0 ? (
                                        <div className="text-center py-10 text-muted-foreground">
                                            {searchQuery ? 'No archived machines found.' : 'No archived machines.'}
                                        </div>
                                    ) : (
                                        filteredArchived.map(machine => (
                                            <MachineItem
                                                key={machine.id}
                                                machine={machine}
                                                isSelected={selectedMachine?.id === machine.id}
                                                onSelect={handleSelect}
                                                onRename={handleRename}
                                                onArchive={handleArchive}
                                                onUnarchive={handleUnarchive}
                                            />
                                        ))
                                    )}
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
