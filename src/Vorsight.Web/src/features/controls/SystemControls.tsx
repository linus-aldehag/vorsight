import { Button, Group, Card, Title, Stack } from '@mantine/core';
import { useState } from 'react';
import { VorsightApi } from '../../api/client';
import { useMachine } from '../../context/MachineContext';

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
        <Stack gap="md">

            <Card withBorder radius="md" padding="xl">
                <Title order={4} mb="md">System Power</Title>
                <Group>
                    <Button color="orange" onClick={() => handleSystem('logout')} loading={loading}>
                        Log Out
                    </Button>
                    <Button color="red" onClick={() => handleSystem('shutdown')} loading={loading}>
                        Shutdown
                    </Button>
                </Group>
            </Card>

            {status && (
                <Card bg="blue.1" padding="sm" radius="md">
                    <Title order={6} ta="center" c="blue.9">{status}</Title>
                </Card>
            )}
        </Stack>
    );
}
