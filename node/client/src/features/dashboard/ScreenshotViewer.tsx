import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMachine } from '@/context/MachineContext';
import { useSettings } from '@/context/SettingsContext';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { useState, memo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

interface ScreenshotViewerProps {
    isDisabled?: boolean;
    isMonitoringEnabled?: boolean;
}

export const ScreenshotViewer = memo(function ScreenshotViewer({ isDisabled, isMonitoringEnabled = true }: ScreenshotViewerProps) {
    const { selectedMachine } = useMachine();
    const { formatTimestamp } = useSettings();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [isWaitingForUpdate, setIsWaitingForUpdate] = useState(false);
    const lastCapturedIdRef = useRef<string | null>(null);


    const fetcher = async (url: string) => {
        const res = await api.get(url);
        return res.data;
    };

    const { data: screenshotData, mutate } = useSWR(
        selectedMachine ? `/api/web/v1/screenshots?machineId=${selectedMachine.id}&limit=1` : null,
        fetcher,
        {
            refreshInterval: 30000, // Poll every 30 seconds for new screenshots
            revalidateOnFocus: false, // Don't refetch when window gets focus
            dedupingInterval: 10000, // Dedupe requests within 10 seconds
        }
    );

    const latestScreenshot = screenshotData?.screenshots?.[0];

    // Reset waiting state when a new screenshot arrives
    useEffect(() => {
        if (isWaitingForUpdate && latestScreenshot?.id !== lastCapturedIdRef.current) {
            setIsWaitingForUpdate(false);
        }
    }, [latestScreenshot?.id, isWaitingForUpdate]);

    const handleCapture = async () => {
        if (!selectedMachine) return;

        try {
            setIsRequesting(true);
            setIsWaitingForUpdate(true);
            lastCapturedIdRef.current = latestScreenshot?.id || null; // Capture current ID

            // Safety timeout: reset waiting state after 30 seconds if no new image arrives
            setTimeout(() => setIsWaitingForUpdate(false), 30000);

            await api.post(`/screenshots/request?machineId=${selectedMachine.id}`);

            // Optimistic UI update or just wait for SWR refresh
            // We'll mutate after a short delay to likely catch the new image
            setTimeout(() => mutate(), 2000);

        } catch (error) {
            console.error('Capture request failed:', error);
        } finally {
            setIsRequesting(false);
        }
    };

    const getSafeTimestamp = (timeStr: string) => {
        if (!timeStr) return '';
        // Only append Z if it's missing timezone info
        if (!timeStr.endsWith('Z') && !timeStr.includes('+')) {
            return timeStr + 'Z';
        }
        return timeStr;
    };

    return (
        <Card variant="glass" className="h-full flex flex-col">
            <CardContent className="flex-1 flex flex-col p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                    {/* Standard Header Content */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tracking-wide uppercase whitespace-nowrap">Latest Screenshot</span>
                        {isDisabled && (
                            <Badge variant="outline" className="text-[10px] bg-muted/50 text-muted-foreground border-border/50">
                                Offline
                            </Badge>
                        )}
                        {!isMonitoringEnabled && !isDisabled && (
                            <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20" title="Automatic capture disabled">
                                Manual Only
                            </Badge>
                        )}
                        {latestScreenshot && (
                            <Badge variant="outline" className="text-xs font-mono hidden sm:inline-flex">
                                {formatTimestamp(getSafeTimestamp(latestScreenshot.createdTime), { includeSeconds: true })}
                            </Badge>
                        )}
                    </div>
                    {selectedMachine && (
                        <button
                            onClick={handleCapture}
                            disabled={isDisabled || isRequesting || isWaitingForUpdate}
                            className={cn(
                                "text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 whitespace-nowrap",
                                isDisabled
                                    ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                                    : "bg-primary/10 hover:bg-primary/20 text-primary"
                            )}
                            title={isDisabled ? "Machine is offline" : "Request a new screenshot immediately"}
                        >
                            {isRequesting || isWaitingForUpdate ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                            {isRequesting ? 'Capturing...' : isWaitingForUpdate ? 'Waiting...' : 'Capture'}
                        </button>
                    )}
                </div>

                <div className="flex-1 flex items-center justify-center min-h-[200px]">
                    {!latestScreenshot ? (
                        <div className="text-center space-y-2">
                            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                No screenshots available
                            </p>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center group">
                            <img
                                key={latestScreenshot.id}
                                src={`/api/web/v1/media/view/${latestScreenshot.id}`}
                                alt="Latest screenshot"
                                className={cn(
                                    "max-w-full max-h-full object-contain rounded border border-border/50 shadow-sm transition-all",
                                    !isDisabled && "cursor-pointer hover:border-primary/50"
                                )}
                                onClick={() => setSelectedImage(`/api/web/v1/media/view/${latestScreenshot.id}`)}
                                style={{
                                    filter: isDisabled ? 'grayscale(100%) opacity(0.7)' : 'none'
                                }}
                            />
                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Click to expand
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>

            {/* Full-size image modal */}
            {selectedImage && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            src={selectedImage}
                            alt="Full size screenshot"
                            className="max-w-[98vw] max-h-[98vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                        />
                        <button className="absolute -top-10 right-0 text-white/70 hover:text-white">
                            Close [Esc]
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </Card>
    );
});
