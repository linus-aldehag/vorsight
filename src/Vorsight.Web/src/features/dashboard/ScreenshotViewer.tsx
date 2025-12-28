import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VorsightApi, type DriveFile } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Camera, X, Maximize2 } from 'lucide-react';

export function ScreenshotViewer({ isDisabled = false }: { isDisabled?: boolean }) {
    const { selectedMachine } = useMachine();
    const [latestImage, setLatestImage] = useState<DriveFile | null>(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
        if (!selectedMachine) return;
        setLoading(true);
        try {
            await VorsightApi.requestScreenshot(selectedMachine.id);
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
        <Card className={`h-full flex flex-col border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden ${isDisabled ? 'opacity-40' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg tracking-wide text-primary flex items-center gap-2">
                    <Camera size={18} />
                    SCREENSHOT
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={requestNew}
                    disabled={loading}
                    className="h-8 border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                >
                    {loading ? 'CAPTURING...' : 'CAPTURE'}
                </Button>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 relative group p-0 bg-black">
                {latestImage ? (
                    <>
                        <div className="absolute inset-0 z-10 scanline pointer-events-none opacity-50" />
                        <div
                            className="w-full h-full relative cursor-pointer"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <img
                                src={`/api/media/${latestImage.id}`}
                                className="w-full h-full object-cover"
                                alt="Latest screenshot"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-xs p-2 flex justify-between text-muted-foreground border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>{latestImage.name}</span>
                                <span>{formatDate(latestImage.createdTime)}</span>
                            </div>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1 rounded">
                                <Maximize2 size={16} className="text-white" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm font-mono p-12 text-center">
                        No screenshot available
                        <br />
                        Waiting for update...
                    </div>
                )}
            </CardContent>

            {/* Portal Modal */}
            {isModalOpen && latestImage && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute -top-10 right-0 text-white hover:text-primary p-2"
                        >
                            <X size={32} />
                        </button>
                        <div className="relative border border-primary/30 bg-black shadow-2xl shadow-primary/20">
                            <div className="absolute inset-0 z-10 scanline pointer-events-none opacity-30" />
                            <img
                                src={`/api/media/${latestImage.id}`}
                                className="max-w-full max-h-[85vh] object-contain"
                                alt="Full screenshot"
                            />
                        </div>
                        <div className="mt-2 flex justify-between text-mono text-sm text-primary/80">
                            <span>{latestImage.name}</span>
                            <span>{formatDate(latestImage.createdTime)}</span>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </Card>
    );
}
