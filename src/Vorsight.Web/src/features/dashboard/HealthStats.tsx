import { Card, Text, Group, SimpleGrid, Title, Box } from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import type { HealthReport } from '../../api/client';

interface HealthStatsProps {
    health: HealthReport;
}

export function HealthStats({ health }: HealthStatsProps) {
    const screenshotData = [
        { name: 'Success', value: health.screenshotsSuccessful, color: 'teal.6' },
        { name: 'Failed', value: health.screenshotsFailed, color: 'red.6' },
    ];

    const uploadData = [
        { name: 'Success', value: health.uploadsSuccessful, color: 'blue.6' },
        { name: 'Failed', value: health.uploadsFailed, color: 'orange.6' },
    ];

    return (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Screenshots</Title>
                <Group justify="center">
                    <Box w={160} h={160}>
                        <DonutChart
                            data={screenshotData}
                            withLabelsLine
                            withLabels
                            size={160}
                            thickness={20}
                        />
                    </Box>
                </Group>
                <Group justify="space-between" mt="md">
                    <Text size="sm" c="dimmed">Success: {health.screenshotsSuccessful}</Text>
                    <Text size="sm" c="dimmed">Total: {health.totalScreenshotsSuccessful + health.totalScreenshotsFailed}</Text>
                </Group>
            </Card>

            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Uploads</Title>
                <Group justify="center">
                    <Box w={160} h={160}>
                        <DonutChart
                            data={uploadData}
                            withLabelsLine
                            withLabels
                            size={160}
                            thickness={20}
                        />
                    </Box>
                </Group>
                <Group justify="space-between" mt="md">
                    <Text size="sm" c="dimmed">Success: {health.uploadsSuccessful}</Text>
                    <Text size="sm" c="dimmed">Total: {health.totalUploadsSuccessful + health.totalUploadsFailed}</Text>
                </Group>
            </Card>
        </SimpleGrid>
    );
}
