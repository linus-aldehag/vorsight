import { Card, Image, Button, Title, Stack, Group, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { VorsightApi, type DriveFile } from '../../api/client';
import { useMachine } from '../../context/MachineContext';

export function ScreenshotViewer() {
    const { selectedMachine } = useMachine();
    const [opened, { open, close }] = useDisclosure(false);
    const [latestImage, setLatestImage] = useState<DriveFile | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedMachine) {
            loadLatest();
            const interval = setInterval(loadLatest, 30000);
            return () => clearInterval(interval);
        }
    }, [selectedMachine]);

    const loadLatest = async () => {
        if (!selectedMachine) return;

        try {
            const screenshots = await VorsightApi.getScreenshots(selectedMachine.id, 1);
            if (screenshots.length > 0) {
                setLatestImage(screenshots[0]);
            }
        } catch (err) {
            console.error('Failed to load latest screenshot', err);
        }
    };

    const requestNew = async () => {
        setLoading(true);
        try {
            await VorsightApi.requestScreenshot();
            // Wait for upload then refresh
            setTimeout(() => {
                loadLatest();
                setLoading(false);
            }, 5000);
        } catch {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <>
            <Modal opened={opened} onClose={close} title="Latest Screenshot" size="xl" centered>
                {latestImage && (
                    <>
                        <Image
                            src={`/api/media/${latestImage.id}`}
                            radius="md"
                            fallbackSrc="https://placehold.co/800x600?text=Failed+to+Load"
                        />
                        <Group justify="space-between" mt="md">
                            <Text size="sm">{latestImage.name}</Text>
                            <Text size="sm" c="dimmed">{formatDate(latestImage.createdTime)}</Text>
                        </Group>
                    </>
                )}
            </Modal>

            <Card withBorder radius="md" padding="xl">
                <Title order={4} mb="md">Visuals</Title>
                <Stack gap="md">
                    {/* Thumbnail Preview */}
                    {latestImage ? (
                        <Card
                            p={0}
                            radius="md"
                            withBorder
                            style={{ cursor: 'pointer', overflow: 'hidden' }}
                            onClick={open}
                        >
                            <Image
                                src={`/api/media/${latestImage.id}`}
                                h={160}
                                alt="Latest screenshot"
                                fallbackSrc="https://placehold.co/400x300?text=No+Screenshot"
                            />
                            <Group justify="space-between" p="xs" bg="dark.6">
                                <Text size="xs" c="dimmed">Latest</Text>
                                <Text size="xs" c="dimmed">{formatDate(latestImage.createdTime)}</Text>
                            </Group>
                        </Card>
                    ) : (
                        <Card p="xl" radius="md" withBorder>
                            <Text size="sm" c="dimmed" ta="center">No screenshots yet</Text>
                        </Card>
                    )}

                    <Button variant="outline" onClick={requestNew} loading={loading}>
                        📸 Capture New
                    </Button>
                </Stack>
            </Card>
        </>
    );
}
