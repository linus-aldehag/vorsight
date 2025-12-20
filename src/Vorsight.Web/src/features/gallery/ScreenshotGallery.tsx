import { useEffect, useState } from 'react';
import { Title, SimpleGrid, Card, Image, Text, Badge, Center, Loader, Group, Button, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconRefresh } from '@tabler/icons-react';
import { VorsightApi, type DriveFile } from '../../api/client';
import { useMachine } from '../../context/MachineContext';

export function ScreenshotGallery() {
    const { selectedMachine } = useMachine();
    const [images, setImages] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<DriveFile | null>(null);
    const [opened, { open, close }] = useDisclosure(false);

    useEffect(() => {
        if (selectedMachine) {
            loadImages();
        }
    }, [selectedMachine]);

    const loadImages = async () => {
        if (!selectedMachine) return;

        setLoading(true);
        try {
            const data = await VorsightApi.getScreenshots(selectedMachine.id, 24);
            setImages(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleImageClick = (img: DriveFile) => {
        setSelectedImage(img);
        open();
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

    if (loading && images.length === 0) return <Center h={200}><Loader /></Center>;

    return (
        <>
            <Group justify="space-between" mb="lg">
                <Title order={3}>Screenshot Gallery</Title>
                <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={loadImages} loading={loading}>
                    Refresh
                </Button>
            </Group>

            {images.length === 0 ? (
                <Center p="xl"><Text c="dimmed">No screenshots found.</Text></Center>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
                    {images.map((img) => (
                        <Card
                            key={img.id}
                            p="sm"
                            radius="md"
                            withBorder
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleImageClick(img)}
                        >
                            <Card.Section>
                                <Image
                                    src={`/api/media/${img.id}`}
                                    h={160}
                                    alt={img.name}
                                    fallbackSrc="https://placehold.co/600x400?text=No+Preview"
                                />
                            </Card.Section>
                            <Group justify="space-between" mt="xs">
                                <Text size="xs" c="dimmed">
                                    {formatDate(img.createdTime)}
                                </Text>
                                <Badge size="xs" variant="light">
                                    Drive
                                </Badge>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            <Modal opened={opened} onClose={close} size="xl" title="Screenshot Viewer" centered>
                {selectedImage && (
                    <>
                        <Image
                            src={`/api/media/${selectedImage.id}`}
                            radius="md"
                            fallbackSrc="https://placehold.co/800x600?text=Failed+to+Load+Image"
                        />
                        <Group justify="space-between" mt="md">
                            <Text size="sm">{selectedImage.name}</Text>
                            <Text size="sm" c="dimmed">{formatDate(selectedImage.createdTime)}</Text>
                        </Group>
                    </>
                )}
            </Modal>
        </>
    );
}
