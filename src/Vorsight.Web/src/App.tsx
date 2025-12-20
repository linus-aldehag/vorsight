import { useEffect, useState } from 'react';
import { AppShell, Group, Container, Badge, Title, Loader, Center, Tabs } from '@mantine/core';
import { VorsightApi, type StatusResponse } from './api/client';
import { Dashboard } from './features/dashboard/Dashboard';
import { ScheduleManager } from './features/schedule/ScheduleManager';
import { ScreenshotGallery } from './features/gallery/ScreenshotGallery';
import { IconLayoutDashboard, IconClock, IconPhoto } from '@tabler/icons-react';

function App() {
    const [status, setStatus] = useState<StatusResponse | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await VorsightApi.getStatus();
                setStatus(data);
            } catch (e) {
                console.error(e);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

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
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Title order={2}>VÖRSIGHT</Title>
                        <Badge color="blue" variant="light">BETA</Badge>
                    </Group>

                    <Group>
                        <Badge
                            size="lg"
                            color={status.uptime.isTracking ? 'green' : 'orange'}
                            variant="dot"
                        >
                            {status.uptime.isTracking ? 'ONLINE' : 'IDLE'}
                        </Badge>
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
