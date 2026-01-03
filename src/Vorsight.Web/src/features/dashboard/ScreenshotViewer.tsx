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

    const fetcher = async (url: string) => {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
    };

    const { data: screenshots } = useSWR(
        selectedMachine ? `/api/machines/${selectedMachine.id}/screenshots?limit=1` : null,
        fetcher,
        { refreshInterval: isDisabled ? 0 : 5000 }
    );

    const latestScreenshot = screenshots?.[0];

    return (
        <Card className={cn(
            "border-border/50 bg-card/50 backdrop-blur-sm h-full flex flex-col",
            isDisabled && "opacity-60"
        )}>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base font-semibold tracking-wide uppercase flex items-center justify-between gap-2">
                    <span>Latest Screenshot</span>
                    {latestScreenshot && (
                        <Badge variant="outline" className="text-xs font-mono">
                            {new Date(latestScreenshot.capture_time + 'Z').toLocaleTimeString()}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-4">
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
                    <img
                        src={`/api/screenshots/${latestScreenshot.id}`}
                        alt="Latest screenshot"
                        className="w-full h-auto object-contain rounded border border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => setSelectedImage(`/api/screenshots/${latestScreenshot.id}`)}
                    />
                )}
            </CardContent>

            {/* Full-size image modal (simple version) */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Full size screenshot"
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            )}
        </Card>
    );
}
