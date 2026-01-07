import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { RefreshCw, X, Maximize2, Eye, Settings2, AlertCircle, ImageOff, Loader2 } from 'lucide-react';
import { VorsightApi, type DriveFile, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { useSettings } from '../../context/SettingsContext';
import { ScreenshotFilters } from './ScreenshotFilters';

// Screenshot Card Component
interface ScreenshotCardProps {
    screenshot: DriveFile;
    onImageClick: (img: DriveFile) => void;
    onImageError: (imgId: string) => void;
    failedImages: Set<string>;
    formatDate: (dateStr: string) => string;
}

function ScreenshotCard({ screenshot, onImageClick, onImageError, failedImages, formatDate }: ScreenshotCardProps) {
    return (
        <Card
            className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group border-border/50 bg-card/50 backdrop-blur-sm"
            onClick={() => onImageClick(screenshot)}
        >
            <div className="aspect-video relative bg-black">
                {failedImages.has(screenshot.id) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/20">
                        <ImageOff className="text-muted-foreground" size={32} />
                        <span className="text-xs text-muted-foreground">File not found</span>
                    </div>
                ) : (
                    <img
                        src={`/api/media/${screenshot.id}`}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        alt={screenshot.name}
                        onError={() => onImageError(screenshot.id)}
                        loading="lazy"
                    />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="text-white" />
                </div>
            </div>
            <CardContent className="p-3">
                <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-mono">
                        {formatDate(screenshot.createdTime)}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5">
                        DRIVE
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}

export function ScreenshotGallery() {
    const { selectedMachine } = useMachine();
    const { formatTimestamp } = useSettings();
    const [screenshots, setScreenshots] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [selectedImage, setSelectedImage] = useState<DriveFile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [settings, setSettings] = useState<AgentSettings>({
        screenshotIntervalSeconds: 300,
        pingIntervalSeconds: 30,
        isMonitoringEnabled: true,
        isAuditEnabled: true
    });
    const [enabled, setEnabled] = useState(true);
    const [interval, setInterval] = useState(5);
    const [tempEnabled, setTempEnabled] = useState(true);
    const [tempInterval, setTempInterval] = useState(5);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

    // Intersection Observer for infinite scroll
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedMachine) {
            setScreenshots([]);
            setCursor(null);
            setHasMore(true);
            setLoading(true);
            loadInitialScreenshots();
            if (!isConfigOpen) {
                loadSettings();
            }
        } else {
            setScreenshots([]);
            setLoading(false);
        }
    }, [selectedMachine?.id]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
            const isEnabled = data.screenshotIntervalSeconds > 0;
            const intervalToUse = isEnabled
                ? data.screenshotIntervalSeconds
                : (data.screenshotIntervalSecondsWhenEnabled || 300);
            const screenshotInterval = Math.round(intervalToUse / 60);
            setEnabled(isEnabled);
            setInterval(screenshotInterval);
            setTempEnabled(isEnabled);
            setTempInterval(screenshotInterval);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const loadInitialScreenshots = async () => {
        if (!selectedMachine) return;

        setLoading(true);
        setFailedImages(new Set());
        try {
            const data = await VorsightApi.getScreenshots(selectedMachine.id, 50);
            setScreenshots(data.screenshots);
            setCursor(data.cursor);
            setHasMore(data.hasMore);
        } catch (err) {
            console.error('Failed to load screenshots:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = useCallback(async () => {
        if (!selectedMachine || !hasMore || loadingMore || !cursor) return;

        setLoadingMore(true);
        try {
            const data = await VorsightApi.getScreenshots(selectedMachine.id, 50, cursor);
            setScreenshots(prev => [...prev, ...data.screenshots]);
            setCursor(data.cursor);
            setHasMore(data.hasMore);
        } catch (err) {
            console.error('Failed to load more screenshots:', err);
        } finally {
            setLoadingMore(false);
        }
    }, [selectedMachine, hasMore, loadingMore, cursor]);

    // Set up Intersection Observer for infinite scroll
    useEffect(() => {
        if (!loadMoreRef.current || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting && !loadingMore) {
                    loadMore();
                }
            },
            {
                root: null,
                rootMargin: '400px', // Start loading 400px before reaching the trigger
                threshold: 0
            }
        );

        observer.observe(loadMoreRef.current);

        return () => {
            if (loadMoreRef.current) {
                observer.unobserve(loadMoreRef.current);
            }
        };
    }, [loadMore, hasMore, loadingMore]);

    const handleApply = async () => {
        if (!selectedMachine) return;

        setSaving(true);
        setError(null);

        try {
            const updatedSettings = {
                ...settings,
                screenshotIntervalSeconds: tempEnabled ? tempInterval * 60 : 0,
                screenshotIntervalSecondsWhenEnabled: tempInterval * 60,
                isMonitoringEnabled: tempEnabled || settings.pingIntervalSeconds > 0
            };

            const response = await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            setSettings(response);
            setEnabled(tempEnabled);
            setInterval(tempInterval);
            setIsConfigOpen(false);
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setTempEnabled(enabled);
        setTempInterval(interval);
        setError(null);
        setIsConfigOpen(false);
    };

    const handleImageError = (imgId: string) => {
        setFailedImages(prev => new Set(prev).add(imgId));
    };

    const handleImageClick = (img: DriveFile) => {
        setSelectedImage(img);
        setIsModalOpen(true);
    };

    const formatDate = (dateStr: string) => {
        return formatTimestamp(dateStr, { includeDate: true, includeSeconds: true });
    };

    // Apply date range filter
    const filteredImages = useMemo(() => {
        return screenshots.filter(img => {
            if (dateRangeFilter === 'all') return true;

            const imageDate = new Date(img.createdTime);
            const now = new Date();
            const diffHours = (now.getTime() - imageDate.getTime()) / (1000 * 60 * 60);

            if (dateRangeFilter === '24h' && diffHours > 24) return false;
            if (dateRangeFilter === '7d' && diffHours > 24 * 7) return false;
            if (dateRangeFilter === '30d' && diffHours > 24 * 30) return false;

            return true;
        });
    }, [screenshots, dateRangeFilter]);

    if (loading && screenshots.length === 0) {
        return <div className="text-center p-20 text-muted-foreground animate-pulse">Loading gallery...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Eye size={24} className="text-primary" />
                    <h3 className="text-2xl font-bold tracking-tight">Screenshot Gallery</h3>
                    {!enabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                            Capture Disabled
                        </span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setTempEnabled(enabled);
                        setTempInterval(interval);
                        setIsConfigOpen(true);
                    }}
                    className="gap-1.5 self-start sm:self-auto"
                >
                    <Settings2 size={16} />
                    Configure
                </Button>
            </div>

            {/* Configuration Modal */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={handleCancel}>
                    <div className="w-full sm:w-[400px] md:w-[450px] lg:w-[500px] max-w-full h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-4 border-b border-border">
                                <h3 className="text-lg font-semibold">Screenshot Capture</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancel}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={16} />
                                </Button>
                            </div>

                            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                                {error && (
                                    <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                        <AlertCircle size={12} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Status</label>
                                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                                        <Switch
                                            checked={tempEnabled}
                                            onCheckedChange={setTempEnabled}
                                        />
                                        <div>
                                            <div className="text-sm font-medium">
                                                {tempEnabled ? 'Enabled' : 'Disabled'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {tempEnabled ? 'Screenshot capture is active' : 'Screenshot capture is paused'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {tempEnabled && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Capture Interval</label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                value={tempInterval}
                                                onChange={(e) => setTempInterval(Number(e.target.value))}
                                                min={1}
                                                max={60}
                                                className="w-20"
                                            />
                                            <span className="text-sm text-muted-foreground">minutes</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            How often to capture screenshots (1-60 minutes)
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                                <Button variant="outline" onClick={handleCancel}>
                                    Cancel
                                </Button>
                                <Button onClick={handleApply} disabled={saving}>
                                    {saving ? 'Applying...' : 'Apply'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <ScreenshotFilters
                dateRangeFilter={dateRangeFilter}
                onDateRangeFilterChange={setDateRangeFilter}
            />

            {/* Gallery Controls */}
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">
                    Screenshots {filteredImages.length !== screenshots.length && `(${filteredImages.length} of ${screenshots.length})`}
                </h4>
                <Button onClick={loadInitialScreenshots} disabled={loading} variant="outline" className="gap-2">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </Button>
            </div>

            {/* Gallery Grid */}
            {screenshots.length === 0 ? (
                <div className="p-20 text-center border border-dashed border-border rounded-lg text-muted-foreground">
                    No screenshots found.
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredImages.map((img) => (
                            <ScreenshotCard
                                key={img.id}
                                screenshot={img}
                                onImageClick={handleImageClick}
                                onImageError={handleImageError}
                                failedImages={failedImages}
                                formatDate={formatDate}
                            />
                        ))}
                    </div>

                    {/* Infinite Scroll Trigger */}
                    {hasMore && (
                        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
                            {loadingMore ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Loading more screenshots...</span>
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground">
                                    Scroll for more...
                                </div>
                            )}
                        </div>
                    )}

                    {!hasMore && screenshots.length > 0 && (
                        <div className="text-center py-8 text-xs text-muted-foreground">
                            All screenshots loaded
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && selectedImage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute -top-10 right-0 text-white hover:text-primary"
                        >
                            <X size={24} />
                        </button>
                        <div className="relative border border-primary/30 bg-black">
                            <div className="absolute inset-0 z-10 scanline pointer-events-none opacity-30" />
                            {failedImages.has(selectedImage.id) ? (
                                <div className="flex flex-col items-center justify-center gap-4 p-20 min-w-[400px] min-h-[300px]">
                                    <ImageOff className="text-muted-foreground" size={64} />
                                    <div className="text-center">
                                        <p className="text-lg text-muted-foreground">File Not Found</p>
                                        <p className="text-sm text-muted-foreground/70 mt-2">This screenshot is no longer available in Google Drive</p>
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={`/api/media/${selectedImage.id}`}
                                    className="max-w-full max-h-[85vh] object-contain"
                                    alt="Full screenshot"
                                    onError={() => handleImageError(selectedImage.id)}
                                />
                            )}
                        </div>
                        <div className="mt-2 flex justify-between text-mono text-sm text-primary/80">
                            <span>{selectedImage.name}</span>
                            <span>{formatDate(selectedImage.createdTime)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
