import { useEffect, useState } from 'react'
import './App.css'

interface HealthReport {
    screenshotsSuccessful: number;
    screenshotsFailed: number;
    uploadsSuccessful: number;
    uploadsFailed: number;
    totalScreenshotsSuccessful: number;
    totalScreenshotsFailed: number;
    totalUploadsSuccessful: number;
    totalUploadsFailed: number;
    periodDuration: string;
    totalRuntime: string;
}

interface UptimeStatus {
    currentStart: string | null;
    lastSeen: string | null;
    isTracking: boolean;
}

interface ActivitySnapshot {
    activeWindowTitle: string;
    timeSinceLastInput: string;
    timestamp: string;
}

interface StatusResponse {
    health: HealthReport;
    uptime: UptimeStatus;
    activity: ActivitySnapshot | null;
}

function App() {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [command, setCommand] = useState('');
    const [args, setArgs] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');

    const fetchStatus = async () => {
        try {
            const res = await fetch('http://localhost:5050/api/status');
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            setStatus(data);
        } catch (e) {
            console.error(e);
            // Keep old status or show error state if needed
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const takeScreenshot = async () => {
        setLoading(true);
        try {
            await fetch('http://localhost:5050/api/screenshot?type=ManualWeb', { method: 'POST' });
            setMsg('Screenshot requested!');
        } catch (e) {
            setMsg('Failed to request screenshot');
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(''), 3000);
        }
    };

    const runCommand = async () => {
        if (!command) return;
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5050/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, arguments: args })
            });
            if (res.ok) setMsg(`Command '${command}' started!`);
            else setMsg('Command failed to start');
        } catch (e) {
            setMsg('Error running command');
        } finally {
            setLoading(false);
            setTimeout(() => setMsg(''), 3000);
        }
    };

    if (!status) return (
        <div className="container">
            <div className="loading">
                <h1>VÖRSIGHT</h1>
                <p>Connecting to Service...</p>
            </div>
        </div>
    );

    return (
        <div className="container">
            <header>
                <h1>VÖRSIGHT <span className="beta">BETA</span></h1>
                <div className="status-badge">
                    {status.uptime && status.uptime.isTracking ? '🟢 ONLINE' : '🟠 IDLE'}
                </div>
            </header>

            <div className="grid">
                <div className="card full-width">
                    <h2>Activity Monitor</h2>
                    <div className="activity-row">
                        <div className="stat">
                            <label>Active Window</label>
                            <div className="value highlight">{status.activity?.activeWindowTitle || 'Unknown'}</div>
                        </div>
                        <div className="stat">
                            <label>Inactivity</label>
                            <div className="value">{status.activity?.timeSinceLastInput || '00:00:00'}</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2>Health Stats</h2>
                    {status.health ? (
                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="label">Screenshots (Period)</span>
                                <span className="val">{status.health.screenshotsSuccessful} / {status.health.screenshotsSuccessful + status.health.screenshotsFailed}</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Uploads (Period)</span>
                                <span className="val">{status.health.uploadsSuccessful} / {status.health.uploadsSuccessful + status.health.uploadsFailed}</span>
                            </div>
                            <div className="stat-item big">
                                <span className="label">Total Runtime</span>
                                <span className="val">{status.health.totalRuntime.split('.')[0]}</span>
                            </div>
                        </div>
                    ) : <div>No Health Data</div>}
                </div>

                <div className="card">
                    <h2>Actions</h2>
                    <div className="actions">
                        <button className="btn-primary" onClick={takeScreenshot} disabled={loading}>
                            📸 Take Screenshot
                        </button>
                        <div className="separator"></div>
                        <h3>Run Command</h3>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="Command (e.g. calc.exe)"
                                value={command}
                                onChange={e => setCommand(e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Args (optional)"
                                value={args}
                                onChange={e => setArgs(e.target.value)}
                            />
                            <button className="btn-secondary" onClick={runCommand} disabled={loading || !command}>
                                🚀 Run
                            </button>
                        </div>
                        {msg && <div className="msg">{msg}</div>}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
