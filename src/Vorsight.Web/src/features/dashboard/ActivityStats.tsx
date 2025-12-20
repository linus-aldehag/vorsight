import { useEffect, useState } from 'react';
import { Card, Text, Group, SimpleGrid, Title, Stack, Progress, Box } from '@mantine/core';
import { VorsightApi, type ActivitySummary } from '../../api/client';

export function ActivityStats() {
    const [summary, setSummary] = useState<ActivitySummary | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const data = await VorsightApi.getActivitySummary();
                setSummary(data);
            } catch (err) {
                console.error("Failed to fetch activity summary", err);
            }
        };

        fetchSummary();
        const interval = setInterval(fetchSummary, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    if (!summary) return null;

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
            {/* Activity Timeline */}
            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Activity Timeline (24h)</Title>
                <Text size="xs" c="dimmed" mb="lg">Active minutes per hour</Text>

                <Box h={200} w="100%" style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                    {/* Y-Axis Label */}
                    <Box w={30} h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 10, color: 'gray' }}>
                        <Text>60m</Text>
                        <Text>30m</Text>
                        <Text>0m</Text>
                    </Box>

                    {/* Bars */}
                    {Array.from({ length: 24 }).map((_, i) => {
                        const hour = i;
                        const stat = summary.timeline.find(t => t.hour === hour);
                        const minutes = stat ? stat.activeMinutes : 0;
                        const heightPercent = (minutes / 60) * 100;
                        const isCurrentHour = new Date().getHours() === hour;

                        return (
                            <Box
                                key={hour}
                                style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', alignItems: 'center' }}
                            >
                                <Box
                                    w="80%"
                                    h={`${heightPercent}%`}
                                    bg={isCurrentHour ? 'blue.4' : 'blue.6'}
                                    style={{ borderRadius: '2px 2px 0 0', minHeight: minutes > 0 ? 2 : 0, transition: 'height 0.3s ease' }}
                                />
                                {hour % 4 === 0 && (
                                    <Text size="xs" c="dimmed" mt={4} style={{ fontSize: 9 }}>
                                        {hour}:00
                                    </Text>
                                )}
                            </Box>
                        );
                    })}
                </Box>
                <Group justify="space-between" mt="md">
                    <Text size="sm">Total Active Hours:</Text>
                    <Text size="lg" fw={700} c="blue">{summary.totalActiveHours}h</Text>
                </Group>
            </Card>

            {/* Top Applications */}
            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Top Applications</Title>
                <Text size="xs" c="dimmed" mb="md">Based on focus time</Text>

                <Stack gap="md">
                    {summary.topApps.length > 0 ? summary.topApps.map((app, index) => (
                        <Box key={index}>
                            <Group justify="space-between" mb={4}>
                                <Text size="sm" span truncate="end" maw="70%">{app.name}</Text>
                                <Text size="sm" c="dimmed">{app.percentage}%</Text>
                            </Group>
                            <Progress value={app.percentage} size="md" color="teal" />
                        </Box>
                    )) : (
                        <Text c="dimmed" fs="italic">No activity recorded</Text>
                    )}
                </Stack>
            </Card>
        </SimpleGrid>
    );
}
