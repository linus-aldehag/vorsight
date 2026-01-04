import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMachine } from '@/context/MachineContext';
import { Image as ImageIcon, Info } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';

interface ScreenshotViewerProps {
    isDisabled?: boolean;
}

export function ScreenshotViewer({ isDisabled }: ScreenshotViewerProps) {
    const { selectedMachine } = useMachine();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);

    const fetcher = async (url: string) => {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
    };

    const { data: screenshots, mutate } = useSWR(
        selectedMachine ? `/api/screenshots/${selectedMachine.id}?limit=1` : null,
        fetcher,
        { refreshInterval: isDisabled ? 0 : 5000 }
    );

    const handleCapture = async () => {
        if (!selectedMachine) return;

        try {
            setIsRequesting(true);
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/screenshots/request?machineId=${selectedMachine.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) throw new Error('Failed to request screenshot');

            // Optimistic UI update or just wait for SWR refresh
            // We'll mutate after a short delay to likely catch the new image
            setTimeout(() => mutate(), 2000);

        } catch (error) {
            console.error('Capture request failed:', error);
            // Ideally trigger a toast notification here
        } finally {
            setIsRequesting(false);
        }
    };

    const latestScreenshot = screenshots?.[0];

    return (
        <Card className={cn(
            "border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col",
            isDisabled && "opacity-60"
        )}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold tracking-wide uppercase flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span>Latest Screenshot</span>
                        {latestScreenshot && (
                            <Badge variant="outline" className="text-xs font-mono hidden sm:inline-flex">
                                {new Date(latestScreenshot.capture_time + 'Z').toLocaleTimeString()}
                            </Badge>
                        )}
                    </div>
                    {!isDisabled && selectedMachine && (
                        <button
                            onClick={handleCapture}
                            disabled={isRequesting}
                            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            title="Request a new screenshot immediately"
                        >
                            <ImageIcon size={12} />
                            {isRequesting ? 'Capturing...' : 'Capture'}
                        </button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-4 min-h-[200px]">
                {isDisabled ? (
                    <div className="text-center space-y-2">
                        <Info className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Screenshot monitoring disabled
                        </p>
                    </div>
                ) : !latestScreenshot ? (
                    <div className="text-center space-y-2">
                        <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            No screenshots available
                        </p>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center group">
                        <img
                            src={`/api/screenshots/${latestScreenshot.id}`}
                            alt="Latest screenshot"
                            className="max-w-full max-h-full object-contain rounded border border-border/50 cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                            onClick={() => setSelectedImage(`/api/screenshots/${latestScreenshot.id}`)}
                        />
                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            Click to expand
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Full-size image modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-full max-h-full">
                        <img
                            src={selectedImage}
                            alt="Full size screenshot"
                            className="max-w-screen md:max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                        <button className="absolute -top-10 right-0 text-white/70 hover:text-white">
                            Close [Esc]
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}
