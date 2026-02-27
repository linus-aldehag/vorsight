import { Card } from '../../components/ui/card';
import { Database, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { useSettings } from '../../context/SettingsContext';
import api from '../../lib/axios';

interface RetentionSettings {
    activityRetentionDays: number;
    screenshotRetentionDays: number;
    auditRetentionDays: number;
    heartbeatRetentionHours: number;
    deleteDriveFiles: boolean;
    lastCleanupRun?: string;
}

export function DataRetention() {
    const { formatTimestamp } = useSettings();
    const [settings, setSettings] = useState<RetentionSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunningCleanup, setIsRunningCleanup] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<RetentionSettings>({
        activityRetentionDays: 90,
        screenshotRetentionDays: 30,
        auditRetentionDays: 180,
        heartbeatRetentionHours: 48,
        deleteDriveFiles: false
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/cleanup');
            const data = response.data;
            setSettings(data);
            setFormData({
                activityRetentionDays: data.activityRetentionDays,
                screenshotRetentionDays: data.screenshotRetentionDays,
                auditRetentionDays: data.auditRetentionDays,
                heartbeatRetentionHours: data.heartbeatRetentionHours || 48,
                deleteDriveFiles: Boolean(data.deleteDriveFiles),
                lastCleanupRun: data.lastCleanupRun
            });
        } catch (error) {
            console.error('Failed to fetch retention settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await api.put('/cleanup', {
                activityRetentionDays: formData.activityRetentionDays,
                screenshotRetentionDays: formData.screenshotRetentionDays,
                auditRetentionDays: formData.auditRetentionDays,
                heartbeatRetentionHours: formData.heartbeatRetentionHours,
                deleteDriveFiles: formData.deleteDriveFiles
            });

            if (response.status === 200) {
                await fetchSettings();
                setEditMode(false);
            }
        } catch (error) {
            console.error('Failed to save retention settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunCleanup = async () => {
        if (!confirm('This will permanently delete old data according to retention policies. Continue?')) {
            return;
        }

        setIsRunningCleanup(true);
        try {
            const response = await api.post('/cleanup/run');

            if (response.status === 200) {
                const result = response.data;
                alert(`Cleanup completed!\n\nActivity records deleted: ${result.stats?.activityDeleted || 0}\nScreenshots deleted: ${result.stats?.screenshotsDeleted || 0}\nAudit events deleted: ${result.stats?.auditsDeleted || 0}`);
                await fetchSettings();
            }
        } catch (error) {
            console.error('Failed to run cleanup:', error);
            alert('Cleanup failed. Check console for details.');
        } finally {
            setIsRunningCleanup(false);
        }
    };

    if (isLoading) {
        return <div className="text-sm text-muted-foreground">Loading retention settings...</div>;
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
                        <Database size={16} className="text-primary" />
                        Data Retention
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Configure how long data is stored before automatic cleanup
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Retention Periods */}
                    <div className="space-y-3">
                        {/* Activity History */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                            <div className="flex-1">
                                <div className="text-sm font-medium">Activity History</div>
                                <div className="text-xs text-muted-foreground">Window titles, process names, timestamps</div>
                            </div>
                            {editMode ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={formData.activityRetentionDays}
                                        onChange={(e) => setFormData({ ...formData, activityRetentionDays: parseInt(e.target.value) || 0 })}
                                        className="w-20 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
                                        min="1"
                                        max="3650"
                                    />
                                    <span className="text-sm text-muted-foreground">days</span>
                                </div>
                            ) : (
                                <div className="text-sm font-mono text-primary font-medium">
                                    {settings?.activityRetentionDays || 90} days
                                </div>
                            )}
                        </div>

                        {/* Screenshots */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                            <div className="flex-1">
                                <div className="text-sm font-medium">Screenshots</div>
                                <div className="text-xs text-muted-foreground">Metadata and Google Drive references</div>
                            </div>
                            {editMode ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={formData.screenshotRetentionDays}
                                        onChange={(e) => setFormData({ ...formData, screenshotRetentionDays: parseInt(e.target.value) || 0 })}
                                        className="w-20 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
                                        min="1"
                                        max="3650"
                                    />
                                    <span className="text-sm text-muted-foreground">days</span>
                                </div>
                            ) : (
                                <div className="text-sm font-mono text-primary font-medium">
                                    {settings?.screenshotRetentionDays || 30} days
                                </div>
                            )}
                        </div>

                        {/* Audit Events */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                            <div className="flex-1">
                                <div className="text-sm font-medium">Audit Events</div>
                                <div className="text-xs text-muted-foreground">Security events and system logs</div>
                            </div>
                            {editMode ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={formData.auditRetentionDays}
                                        onChange={(e) => setFormData({ ...formData, auditRetentionDays: parseInt(e.target.value) || 0 })}
                                        className="w-20 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
                                        min="1"
                                        max="3650"
                                    />
                                    <span className="text-sm text-muted-foreground">days</span>
                                </div>
                            ) : (
                                <div className="text-sm font-mono text-primary font-medium">
                                    {settings?.auditRetentionDays || 180} days
                                </div>
                            )}
                        </div>

                        {/* Heartbeat Snapshots */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/30">
                            <div className="flex-1">
                                <div className="text-sm font-medium">Activity Heartbeats</div>
                                <div className="text-xs text-muted-foreground">Raw snapshots for debugging (sessions kept permanently)</div>
                            </div>
                            {editMode ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={formData.heartbeatRetentionHours}
                                        onChange={(e) => setFormData({ ...formData, heartbeatRetentionHours: parseInt(e.target.value) || 0 })}
                                        className="w-20 px-3 py-1.5 text-sm rounded-md border border-border bg-background text-foreground"
                                        min="1"
                                        max="720"
                                    />
                                    <span className="text-sm text-muted-foreground">hours</span>
                                </div>
                            ) : (
                                <div className="text-sm font-mono text-primary font-medium">
                                    {settings?.heartbeatRetentionHours || 48} hours
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Delete Drive Files Toggle - always visible when editing */}
                    {editMode && (
                        <div className="pt-2 border-t border-border/30">
                            <div className="flex items-start justify-between p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
                                        <AlertTriangle size={14} />
                                        Delete Google Drive Files
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Also remove screenshot files from Google Drive during cleanup (not just metadata)
                                    </div>
                                </div>
                                <Switch
                                    checked={formData.deleteDriveFiles}
                                    onCheckedChange={(checked) => setFormData({ ...formData, deleteDriveFiles: checked })}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {editMode ? (
                        <>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                            <Button
                                onClick={() => {
                                    setEditMode(false);
                                    if (settings) {
                                        setFormData({
                                            activityRetentionDays: settings.activityRetentionDays,
                                            screenshotRetentionDays: settings.screenshotRetentionDays,
                                            auditRetentionDays: settings.auditRetentionDays,
                                            heartbeatRetentionHours: settings.heartbeatRetentionHours || 48,
                                            deleteDriveFiles: Boolean(settings.deleteDriveFiles)
                                        });
                                    }
                                }}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                onClick={() => setEditMode(true)}
                                variant="outline"
                                className="flex-1"
                            >
                                Edit Retention Policies
                            </Button>
                            <Button
                                onClick={handleRunCleanup}
                                disabled={isRunningCleanup}
                                variant="outline"
                                className={cn(
                                    "flex items-center gap-2",
                                    isRunningCleanup && "opacity-50"
                                )}
                            >
                                <Trash2 size={14} />
                                {isRunningCleanup ? 'Cleaning...' : 'Run Now'}
                            </Button>
                        </>
                    )}
                </div>

                {settings?.lastCleanupRun && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                        Last cleanup: {formatTimestamp(new Date(settings.lastCleanupRun + 'Z'), { includeDate: true })}
                    </div>
                )}
            </div>
        </Card>
    );
}
