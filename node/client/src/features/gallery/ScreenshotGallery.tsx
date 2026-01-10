import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { RefreshCw, X, Maximize2, Eye, ImageOff, Loader2 } from 'lucide-react';
import { VorsightApi, type DriveFile, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { useSettings } from '../../context/SettingsContext';
import { ScreenshotFilters } from './ScreenshotFilters';
import { ConfigSection } from '../../components/common/ConfigSection';
import { ScreenshotConfig } from './ScreenshotConfig';

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
    const [settings, setSettings] = useState<AgentSettings | null>(null);
    const [saving, setSaving] = useState(false);
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
            loadSettings();
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
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const loadInitialScreenshots = async () => {
        if (!selectedMachine) return;

        setLoading(true);
        setFailedImages(new Set());
        try {
            const data = await VorsightApi.getScreenshots(selectedMachine.id, 20);
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
            const data = await VorsightApi.getScreenshots(selectedMachine.id, 20, cursor);
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

    const handleScreenshotSave = async (updates: Partial<AgentSettings>) => {
        if (!selectedMachine || !settings) return;
        setSaving(true);
        try {
            const updatedSettings = { ...settings, ...updates };
            const response = await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            setSettings(response);
            const { settingsEvents } = await import('../../lib/settingsEvents');
            settingsEvents.emit();
        } catch (err) {
            console.error('Failed to save settings:', err);
        } finally {
            setSaving(false);
        }
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
        return (screenshots || []).filter(img => {
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
            {/* Configuration Section with Header */}
            {settings && (
                <ConfigSection
                    icon={<Eye size={24} />}
                    title="Screenshot Gallery"
                    badge={!settings.isScreenshotEnabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20">
                            Capture Disabled
                        </span>
                    )}
                >
                    <ScreenshotConfig
                        settings={settings}
                        onSave={handleScreenshotSave}
                        saving={saving}
                    />
                </ConfigSection>
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
