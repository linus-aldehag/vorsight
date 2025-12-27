import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { RefreshCw, X, Maximize2, Eye, Settings2, AlertCircle } from 'lucide-react';
import { VorsightApi, type DriveFile, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';
import { ScreenshotFilters } from './ScreenshotFilters';

export function ScreenshotGallery() {
    const { selectedMachine } = useMachine();
    const [images, setImages] = useState<DriveFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<DriveFile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [settings, setSettings] = useState<AgentSettings>({
        screenshotIntervalSeconds: 300,
        pingIntervalSeconds: 30,
        isMonitoringEnabled: true
    });
    const [enabled, setEnabled] = useState(true);
    const [interval, setInterval] = useState(5);
    const [tempEnabled, setTempEnabled] = useState(true);
    const [tempInterval, setTempInterval] = useState(5);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dateRangeFilter, setDateRangeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

    useEffect(() => {
        if (selectedMachine) {
            loadImages();
            loadSettings();
        }
    }, [selectedMachine]);

    const loadSettings = async () => {
        if (!selectedMachine) return;
        try {
            const data = await VorsightApi.getSettings(selectedMachine.id);
            setSettings(data);
            const isEnabled = data.screenshotIntervalSeconds > 0;
            const screenshotInterval = Math.round(data.screenshotIntervalSeconds / 60);
            setEnabled(isEnabled);
            setInterval(screenshotInterval);
            setTempEnabled(isEnabled);
            setTempInterval(screenshotInterval);
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

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

    const handleApply = async () => {
        if (!selectedMachine) return;

        setSaving(true);
        setError(null);

        try {
            const updatedSettings = {
                ...settings,
                screenshotIntervalSeconds: tempEnabled ? tempInterval * 60 : 0,
                isMonitoringEnabled: tempEnabled || settings.pingIntervalSeconds > 0
            };

            await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            setSettings(updatedSettings);
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

    const handleImageClick = (img: DriveFile) => {
        setSelectedImage(img);
        setIsModalOpen(true);
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

    // Apply date range filter
    const filteredImages = images.filter(img => {
        if (dateRangeFilter === 'all') return true;

        const imageDate = new Date(img.createdTime);
        const now = new Date();
        const diffHours = (now.getTime() - imageDate.getTime()) / (1000 * 60 * 60);

        if (dateRangeFilter === '24h' && diffHours > 24) return false;
        if (dateRangeFilter === '7d' && diffHours > 24 * 7) return false;
        if (dateRangeFilter === '30d' && diffHours > 24 * 30) return false;

        return true;
    });

    if (loading && images.length === 0) return <div className="text-center p-20 text-muted-foreground animate-pulse">Loading gallery...</div>;

    return (
        <div className="space-y-6">
            {/* Simple header: title + icon on left, configure button on right */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Eye size={24} className="text-primary" />
                    <h3 className="text-2xl font-bold tracking-tight">Screenshot Gallery</h3>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setTempEnabled(enabled);
                        setTempInterval(interval);
                        setIsConfigOpen(true);
                    }}
                    className="gap-1.5"
                >
                    <Settings2 size={16} />
                    Configure
                </Button>
            </div>

            {/* Configuration Modal */}
            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50">
                    <div className="w-[360px] h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right">
                        <div className="flex flex-col h-full">
                            {/* Modal header */}
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

                            {/* Modal content */}
                            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
                                {error && (
                                    <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                        <AlertCircle size={12} />
                                        {error}
                                    </div>
                                )}

                                {/* Enable/Disable Toggle */}
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

                                {/* Interval Setting */}
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

                            {/* Modal footer */}
                            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    disabled={saving}
                                >
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

            {/* Gallery Grid */}
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">
                    Screenshots {filteredImages.length !== images.length && `(${filteredImages.length} of ${images.length})`}
                </h4>
                <Button onClick={loadImages} disabled={loading} variant="outline" className="gap-2">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </Button>
            </div>

            {images.length === 0 ? (
                <div className="p-20 text-center border border-dashed border-border rounded-lg text-muted-foreground">
                    No screenshots found.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredImages.map((img) => (
                        <Card
                            key={img.id}
                            className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors group border-border/50 bg-card/50 backdrop-blur-sm"
                            onClick={() => handleImageClick(img)}
                        >
                            <div className="aspect-video relative bg-black">
                                <img
                                    src={`/api/media/${img.id}`}
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    alt={img.name}
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="text-white" />
                                </div>
                            </div>
                            <CardContent className="p-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {formatDate(img.createdTime)}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                        DRIVE
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Simple Modal */}
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
                            <img
                                src={`/api/media/${selectedImage.id}`}
                                className="max-w-full max-h-[85vh] object-contain"
                                alt="Full screenshot"
                            />
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
