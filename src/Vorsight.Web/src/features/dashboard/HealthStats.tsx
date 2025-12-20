import { Card, Text, Group, SimpleGrid, Title, Box } from '@mantine/core';
import type { HealthReport } from '../../api/client';

interface HealthStatsProps {
    health: HealthReport;
}

export function HealthStats({ health }: HealthStatsProps) {
    return (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Screenshots</Title>
                <Group justify="space-between">
                    <Box>
                        <Text size="xs" c="dimmed">Success Rate</Text>
                        <Text size="xl" fw={700} c="teal">
                            {health.totalScreenshotsSuccessful + health.totalScreenshotsFailed > 0
                                ? Math.round((health.totalScreenshotsSuccessful / (health.totalScreenshotsSuccessful + health.totalScreenshotsFailed)) * 100)
                                : 0}%
                        </Text>
                    </Box>
                    <Box>
                        <Text size="xs" c="dimmed">Total Taken</Text>
                        <Text size="xl" fw={700}>{health.totalScreenshotsSuccessful + health.totalScreenshotsFailed}</Text>
                    </Box>
                </Group>
                <Group mt="md">
                    <Text size="sm" c="green.6">✓ {health.totalScreenshotsSuccessful}</Text>
                    <Text size="sm" c="red.6">✗ {health.totalScreenshotsFailed}</Text>
                </Group>
            </Card>

            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Uploads</Title>
                <Group justify="space-between">
                    <Box>
                        <Text size="xs" c="dimmed">Success Rate</Text>
                        <Text size="xl" fw={700} c="blue">
                            {health.totalUploadsSuccessful + health.totalUploadsFailed > 0
                                ? Math.round((health.totalUploadsSuccessful / (health.totalUploadsSuccessful + health.totalUploadsFailed)) * 100)
                                : 0}%
                        </Text>
                    </Box>
                    <Box>
                        <Text size="xs" c="dimmed">Total Uploaded</Text>
                        <Text size="xl" fw={700}>{health.totalUploadsSuccessful + health.totalUploadsFailed}</Text>
                    </Box>
                </Group>
                <Group mt="md">
                    <Text size="sm" c="blue.6">✓ {health.totalUploadsSuccessful}</Text>
                    <Text size="sm" c="orange.6">✗ {health.totalUploadsFailed}</Text>
                </Group>
            </Card>
        </SimpleGrid>
    );
}
