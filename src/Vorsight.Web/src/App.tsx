import { useEffect, useState } from 'react';
import { AppShell, Group, Container, Badge, Title, Loader, Center, Tabs } from '@mantine/core';
import { VorsightApi, type StatusResponse } from './api/client';
import { Dashboard } from './features/dashboard/Dashboard';
import { ScheduleManager } from './features/schedule/ScheduleManager';
import { ScreenshotGallery } from './features/gallery/ScreenshotGallery';
import { MachineSelector } from './components/MachineSelector/MachineSelector';
import { useMachine } from './context/MachineContext';
import { IconLayoutDashboard, IconClock, IconPhoto } from '@tabler/icons-react';

function App() {
    const { selectedMachine } = useMachine();
    const [status, setStatus] = useState<StatusResponse | null>(null);

    useEffect(() => {
        if (selectedMachine) {
            fetchStatus();
            const interval = setInterval(fetchStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedMachine]);

    const fetchStatus = async () => {
        if (!selectedMachine) return;

        try {
            const data = await VorsightApi.getStatus(selectedMachine.id);
            setStatus(data);
        } catch (e) {
            console.error(e);
        }
    };

    if (!status) return (
        <Center h="100vh">
            <Loader size="xl" type="dots" />
        </Center>
    );

    return (
        <AppShell
            header={{ height: 60 }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Group style={{ flex: 1 }}>
                        <Title order={2}>VÖRSIGHT</Title>
                        <Badge color="blue" variant="light">BETA</Badge>
                    </Group>

                    <MachineSelector />

                    <Group style={{ flex: 1 }} justify="flex-end">
                        {/* Right side placeholder */}
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Main bg="dark.8">
                <Container size="xl">
                    <Tabs defaultValue="dashboard" variant="pills" radius="md">
                        <Tabs.List mb="lg">
                            <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard size={16} />}>
                                Dashboard
                            </Tabs.Tab>
                            <Tabs.Tab value="schedule" leftSection={<IconClock size={16} />}>
                                Settings
                            </Tabs.Tab>
                            <Tabs.Tab value="gallery" leftSection={<IconPhoto size={16} />}>
                                Gallery
                            </Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value="dashboard">
                            <Dashboard status={status} />
                        </Tabs.Panel>

                        <Tabs.Panel value="schedule">
                            <ScheduleManager />
                        </Tabs.Panel>

                        <Tabs.Panel value="gallery">
                            <ScreenshotGallery />
                        </Tabs.Panel>
                    </Tabs>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}

export default App;
