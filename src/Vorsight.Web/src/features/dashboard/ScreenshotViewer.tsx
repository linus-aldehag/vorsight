import { Card, Image, Button, Title, Stack, Group, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { VorsightApi } from '../../api/client';

export function ScreenshotViewer() {
    const [opened, { open, close }] = useDisclosure(false);
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadScreenshot = async () => {
        setLoading(true);
        // Add timestamp to prevent caching
        setImgUrl(`http://localhost:5050/api/media/latest-screenshot?t=${Date.now()}`);
        setLoading(false);
        open();
    };

    const requestNew = async () => {
        setLoading(true);
        try {
            await VorsightApi.requestScreenshot();
            // Wait a bit for upload
            setTimeout(() => {
                loadScreenshot();
            }, 5000);
        } catch {
            setLoading(false);
        }
    };

    return (
        <>
            <Modal opened={opened} onClose={close} title="Latest Capture" size="xl">
                {imgUrl && <Image src={imgUrl} radius="md" />}
                <Group justify="center" mt="md">
                    <Button onClick={loadScreenshot}>Refresh</Button>
                </Group>
            </Modal>

            <Card withBorder radius="md" padding="xl">
                <Title order={4} mb="md">Visuals</Title>
                <Stack>
                    <Button variant="light" onClick={loadScreenshot}>
                        👁️ View Latest Screenshot
                    </Button>
                    <Button variant="outline" onClick={requestNew} loading={loading}>
                        📸 Capture New
                    </Button>
                </Stack>
            </Card>
        </>
    );
}
