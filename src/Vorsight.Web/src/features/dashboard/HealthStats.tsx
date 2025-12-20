import { Card, Text, Group, Title, Box } from '@mantine/core';
import type { HealthReport } from '../../api/client';

interface HealthStatsProps {
    health: HealthReport;
}

export function HealthStats({ health: _health }: HealthStatsProps) {
    return (
        <Card withBorder padding="lg" radius="md">
            <Group justify="space-between">
                <Box>
                    <Title order={4}>System Status</Title>
                    <Text size="sm" c="dimmed">Monitoring Service Active</Text>
                </Box>
                {/* We can add a simple badge or status indicator here later */}
            </Group>
        </Card>
    );
}
