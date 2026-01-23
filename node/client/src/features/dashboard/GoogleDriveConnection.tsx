import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Cloud, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import api from '../../lib/axios';

interface OAuthStatus {
    connected: boolean;
    connectedAt?: string;
    expiresAt?: string;
    isExpired?: boolean;
}

export function GoogleDriveConnection() {
    const { formatTimestamp } = useSettings();
    const [status, setStatus] = useState<OAuthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const response = await api.get('/oauth/status');
            setStatus(response.data);
        } catch (err) {
            console.error('Failed to check OAuth status:', err);
            setError('Failed to check connection status');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = () => {
        // Redirect to OAuth flow
        window.location.href = '/api/web/v1/oauth/google';
    };

    const handleDisconnect = async () => {
        try {
            setLoading(true);
            await api.post('/oauth/google/disconnect');
            await checkStatus();
        } catch (err) {
            setError('Failed to disconnect');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm tracking-wide text-primary flex items-center gap-2">
                        <Cloud size={16} />
                        GOOGLE DRIVE
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm tracking-wide text-primary flex items-center gap-2">
                    <Cloud size={16} />
                    GOOGLE DRIVE
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {error && (
                    <div className="text-xs text-destructive flex items-center gap-2">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                {status?.connected ? (
                    <>
                        <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 size={14} className="text-success" />
                            <span className="text-success font-medium">Connected</span>
                        </div>
                        {status.connectedAt && (
                            <div className="text-xs text-muted-foreground">
                                Connected: {formatTimestamp(status.connectedAt, { includeDate: true, includeSeconds: true })}
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            disabled={loading}
                            className="w-full text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                            Disconnect
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 text-xs">
                            <XCircle size={14} className="text-muted-foreground" />
                            <span className="text-muted-foreground">Not Connected</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Connect to enable screenshot uploads to Google Drive
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConnect}
                            className="w-full text-xs border-primary/50 text-primary hover:bg-primary/10"
                        >
                            <Cloud size={14} className="mr-2" />
                            Connect Google Drive
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
