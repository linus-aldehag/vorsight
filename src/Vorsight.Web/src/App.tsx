import { useEffect, useState } from 'react';
import { AppShell, Group, Container, Grid, Badge, Title, Loader, Center, Stack } from '@mantine/core';
import { VorsightApi, type StatusResponse } from './api/client';
import { HealthStats } from './features/dashboard/HealthStats';
import { ActivityMonitor } from './features/dashboard/ActivityMonitor';
import { SystemControls } from './features/controls/SystemControls';
import { ScreenshotViewer } from './features/dashboard/ScreenshotViewer';

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
                    <Grid gutter="lg">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            <Title order={3} mb="lg">Health & Activity</Title>
                            <Grid>
                                <Grid.Col span={12}>
                                    <ActivityMonitor activity={status.activity} />
                                </Grid.Col>
                                <Grid.Col span={12}>
                                    {status.health && <HealthStats health={status.health} />}
                                </Grid.Col>
                            </Grid>
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 4 }}>
                            <Title order={3} mb="lg">Controls</Title>
                            <Stack gap="lg">
                                <SystemControls />
                                <ScreenshotViewer />
                            </Stack>
                        </Grid.Col>
                    </Grid>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}

export default App;
