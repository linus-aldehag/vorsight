import { SegmentedControl, Group, Badge, Text } from '@mantine/core';
import { IconDeviceDesktop, IconCircleFilled } from '@tabler/icons-react';
import { useMachine } from '../../context/MachineContext';

export function MachineSelector() {
    const { machines, selectedMachine, selectMachine, isLoading } = useMachine();

    if (isLoading) {
        return <Text c="dimmed">Loading machines...</Text>;
    }

    if (machines.length === 0) {
        return (
            <Badge color="yellow" variant="light">
                No machines registered
            </Badge>
        );
    }

    // For single machine, just show the name
    if (machines.length === 1) {
        return (
            <Group gap="xs">
                <IconDeviceDesktop size={20} />
                <Text fw={500}>{machines[0].name}</Text>
                <IconCircleFilled
                    size={10}
                    style={{ color: machines[0].isOnline ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-gray-5)' }}
                />
            </Group>
        );
    }

    // For multiple machines, use segmented control
    return (
        <SegmentedControl
            value={selectedMachine?.id || ''}
            onChange={selectMachine}
            data={machines.map(machine => ({
                value: machine.id,
                label: (
                    <Group gap="xs" wrap="nowrap">
                        <IconDeviceDesktop size={16} />
                        <Text size="sm">{machine.name}</Text>
                        <IconCircleFilled
                            size={8}
                            style={{ color: machine.isOnline ? 'var(--mantine-color-green-6)' : 'var(--mantine-color-gray-5)' }}
                        />
                    </Group>
                ),
            }))}
        />
    );
}
