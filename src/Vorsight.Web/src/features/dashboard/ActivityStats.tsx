import { useEffect, useState } from 'react';
import { Card, Text, Group, SimpleGrid, Title, Stack, Progress, Box, Tooltip } from '@mantine/core';
import { VorsightApi, type ActivitySummary } from '../../api/client';
import { useMachine } from '../../context/MachineContext';

export function ActivityStats() {
    const { selectedMachine } = useMachine();
    const [summary, setSummary] = useState<ActivitySummary | null>(null);

    useEffect(() => {
        if (selectedMachine) {
            fetchSummary();
            const interval = setInterval(fetchSummary, 30000);
            return () => clearInterval(interval);
        }
    }, [selectedMachine]);

    const fetchSummary = async () => {
        if (!selectedMachine) return;

        try {
            const data = await VorsightApi.getActivitySummary(selectedMachine.id);
            setSummary(data);
        } catch (err) {
            console.error("Failed to fetch activity summary", err);
        }
    };

    if (!summary) return null;

    return (
        <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
            {/* Activity Timeline */}
            <Card withBorder padding="lg" radius="md">
                <Title order={4} mb="md">Activity Timeline (24h)</Title>
                <Text size="xs" c="dimmed" mb="lg">Active minutes per hour</Text>

                <Box>
                    {/* Chart Area with Y-Axis and Bars */}
                    <Box h={180} w="100%" style={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                        {/* Y-Axis Label */}
                        <Box w={35} h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: 4 }}>
                            <Text size="xs" c="dimmed">60m</Text>
                            <Text size="xs" c="dimmed">30m</Text>
                            <Text size="xs" c="dimmed">0m</Text>
                        </Box>

                        {/* Bars Only */}
                        <Box style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                            {Array.from({ length: 24 }).map((_, i) => {
                                const hour = i;
                                const stat = summary.timeline.find(t => t.hour === hour);
                                const minutes = stat ? stat.activeMinutes : 0;
                                const heightPercent = (minutes / 60) * 100;
                                const isCurrentHour = new Date().getHours() === hour;

                                return (
                                    <Box
                                        key={hour}
                                        w="100%"
                                        h={`${heightPercent}%`}
                                        bg={isCurrentHour ? 'blue.4' : 'blue.6'}
                                        style={{
                                            flex: 1,
                                            borderRadius: '2px 2px 0 0',
                                            minHeight: minutes > 0 ? 2 : 0,
                                            transition: 'height 0.3s ease',
                                            minWidth: 0
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>

                    {/* X-Axis Labels Below */}
                    <Box w="100%" style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                        <Box w={35} /> {/* Spacer for Y-axis */}
                        <Box style={{ flex: 1, display: 'flex', gap: 2 }}>
                            {Array.from({ length: 24 }).map((_, i) => (
                                <Box key={i} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                                    {i % 6 === 0 && (
                                        <Text size="xs" c="dimmed" style={{ fontSize: 9, whiteSpace: 'nowrap' }}>
                                            {i}:00
                                        </Text>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Box>
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
                                <Tooltip label={app.name} openDelay={300}>
                                    <Text size="sm" span truncate="end" maw="70%">{app.name}</Text>
                                </Tooltip>
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
