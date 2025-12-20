import { Grid, Title, Stack } from '@mantine/core';
import { type StatusResponse } from '../../api/client';
import { HealthStats } from './HealthStats';
import { ActivityStats } from './ActivityStats';
import { ActivityMonitor } from './ActivityMonitor';
import { AuditAlert } from './AuditAlert';
import { SystemControls } from '../controls/SystemControls';
import { ScreenshotViewer } from './ScreenshotViewer';

interface DashboardProps {
    status: StatusResponse;
}

export function Dashboard({ status }: DashboardProps) {
    return (
        <>
            <AuditAlert audit={status.audit || null} />
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
                        <Grid.Col span={12}>
                            <ActivityStats />
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
        </>
    );
}
