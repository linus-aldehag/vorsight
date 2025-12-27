import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { RefreshCw, X, Maximize2, Eye, Settings2, AlertCircle } from 'lucide-react';
import { VorsightApi, type DriveFile, type AgentSettings } from '../../api/client';
import { useMachine } from '../../context/MachineContext';

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
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setEnabled(data.screenshotIntervalSeconds > 0);
            setInterval(Math.round(data.screenshotIntervalSeconds / 60));
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
                screenshotIntervalSeconds: enabled ? interval * 60 : 0,
                isMonitoringEnabled: enabled || settings.pingIntervalSeconds > 0
            };

            await VorsightApi.saveSettings(selectedMachine.id, updatedSettings);
            setSettings(updatedSettings);
            setIsConfigOpen(false);
        } catch (err) {
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
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

    if (loading && images.length === 0) return <div className="text-center p-20 text-muted-foreground animate-pulse">Loading gallery...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold tracking-tight">Screenshot Gallery</h3>

                {/* Compact inline configuration */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                        <Eye size={16} className="text-muted-foreground" />
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            className="scale-90"
                        />
                        <span className={enabled ? "text-foreground" : "text-muted-foreground"}>
                            {enabled ? `Every ${interval} min` : 'Disabled'}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsConfigOpen(true)}
                        className="gap-1.5 h-8"
                    >
                        <Settings2 size={14} />
                        Configure
                    </Button>
                </div>
            </div>

            {/* Configuration Modal */}
            {isConfigOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsConfigOpen(false)} />
                    <div className="fixed right-6 top-32 z-50 w-[360px] border border-border bg-card shadow-2xl rounded-lg">
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Eye size={16} className="text-primary" />
                                <h3 className="font-semibold text-sm">Capture Interval</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsConfigOpen(false)}
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        <div className="p-4 space-y-4">
                            {error && (
                                <div className="bg-destructive/10 text-destructive border border-destructive/50 p-2.5 rounded-md flex items-center gap-2 text-xs">
                                    <AlertCircle size={12} />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Interval (minutes)</label>
                                <Input
                                    type="number"
                                    value={interval}
                                    onChange={(e) => setInterval(parseInt(e.target.value) || 5)}
                                    min={1}
                                    max={60}
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Range: 1-60 minutes (recommended: 5-10)
                                </p>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        loadSettings();
                                        setIsConfigOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleApply}
                                    disabled={saving}
                                    className="flex-1"
                                >
                                    {saving ? 'Applying...' : 'Apply'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Gallery Grid */}
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold">Recent Screenshots</h4>
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
                    {images.map((img) => (
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
