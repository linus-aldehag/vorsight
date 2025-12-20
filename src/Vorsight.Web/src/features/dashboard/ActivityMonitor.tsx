import { Card, Text, Stack, Title, Badge, Group } from '@mantine/core';
import type { ActivitySnapshot } from '../../api/client';

interface ActivityMonitorProps {
    activity: ActivitySnapshot | null;
}

export function ActivityMonitor({ activity }: ActivityMonitorProps) {
    if (!activity) return <Card><Text>No activity data</Text></Card>;

    // Creative Status Logic
    const getStatus = (title: string, idleTime: string) => {
        // Parse "00:05:30" format
        if (idleTime && !idleTime.startsWith("00:00")) return { label: 'AFK / Idle', color: 'yellow' };

        const t = (title || '').toLowerCase();
        if (t.includes('code') || t.includes('studio') || t.includes('vim') || t.includes('jetbrains')) return { label: '👨‍💻 Coding', color: 'blue' };
        if (t.includes('discord') || t.includes('spotify') || t.includes('music')) return { label: '🎵 Chilling', color: 'grape' };
        if (t.includes('chrome') || t.includes('firefox') || t.includes('edge') || t.includes('brave')) return { label: '🌐 Browsing', color: 'cyan' };
        if (t.includes('game') || t.includes('steam') || t.includes('hero') || t.includes('league')) return { label: '🎮 Gaming', color: 'green' };
        if (t.includes('chat') || t.includes('slack') || t.includes('teams')) return { label: '💬 Chatting', color: 'indigo' };

        return { label: 'Working', color: 'gray' };
    };

    const status = getStatus(activity.activeWindowTitle, activity.timeSinceLastInput);

    return (
        <Card withBorder padding="xl" radius="md" bg="var(--mantine-color-body)">
            <Group justify="space-between" mb="xs">
                <Title order={3}>Current Activity</Title>
                <Badge color={status.color} size="lg" variant="light">{status.label}</Badge>
            </Group>

            <Stack>
                <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Active Window
                    </Text>
                    <Text size="lg" fw={500} truncate="end">
                        {activity.activeWindowTitle || 'IDLE / Desktop'}
                    </Text>
                </div>

                <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Time Since Input
                    </Text>
                    <Text size="xl" fw={700} variant="gradient" gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}>
                        {activity.timeSinceLastInput}
                    </Text>
                </div>

                <Text size="xs" c="dimmed" mt="md">
                    Last snapshot: {new Date(activity.timestamp).toLocaleString('sv-SE', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    })}
                </Text>
            </Stack>
        </Card>
    );
}
