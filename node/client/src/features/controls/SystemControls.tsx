import { useState } from 'react';
import { VorsightApi } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Button } from '../../components/ui/button';
import { Power, LogOut } from 'lucide-react';

export function SystemControls() {
    const { selectedMachine } = useMachine();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const handleSystem = async (action: 'shutdown' | 'logout') => {
        if (!selectedMachine) return;
        setLoading(true);
        setStatus(`Executing ${action}...`);
        try {
            const res = await VorsightApi.systemAction(action, selectedMachine.id);
            setStatus(res.status);
        } catch (e) {
            setStatus('Failed');
        } finally {
            setLoading(false);
            setTimeout(() => setStatus(null), 3000);
        }
    };

    return (
        <div className="space-y-6">


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                    variant="outline"
                    className="border-warning text-warning hover:bg-warning/10 hover:text-warning"
                    onClick={() => handleSystem('logout')}
                    disabled={loading}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    LOG OUT
                </Button>
                <Button
                    variant="destructive"
                    className="bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/20"
                    onClick={() => handleSystem('shutdown')}
                    disabled={loading}
                >
                    <Power className="mr-2 h-4 w-4" />
                    SHUT DOWN
                </Button>
            </div>

            {status && (
                <div className="p-2 text-xs font-mono text-center text-primary border border-primary/20 bg-primary/5">
                    {status}
                </div>
            )}
        </div>
    );
}
