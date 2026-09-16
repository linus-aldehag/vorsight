import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(passphrase);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid passphrase');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20">
            <div className="bg-surface border border-border rounded-lg p-12 w-full max-w-md shadow-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-wider mb-2 text-foreground">
                        VÖRSIGHT
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Parental Monitoring Dashboard
                    </p>
                </div>

                {import.meta.env.VITE_DEMO_MODE === 'true' && (
                    <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                            <span>🎮 Interactive Demo Mode Active</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Runs 100% inside your browser. Enter <strong>any passphrase</strong> or click below to enter.
                        </p>
                        <button
                            type="button"
                            onClick={() => login('demo-mode')}
                            className="w-full py-2 px-3 mt-1 bg-primary/20 hover:bg-primary/30 text-primary font-medium text-xs rounded border border-primary/30 transition-colors flex items-center justify-center gap-1.5"
                        >
                            ⚡ Quick Demo Login
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="passphrase"
                            className="text-sm font-medium text-muted-foreground"
                        >
                            Passphrase
                        </label>
                        <input
                            id="passphrase"
                            type="password"
                            placeholder={import.meta.env.VITE_DEMO_MODE === 'true' ? "Any passphrase (e.g. demo)" : "Enter your passphrase"}
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            disabled={isLoading}
                            autoFocus
                            className="px-4 py-3 bg-input border border-border rounded text-foreground focus:outline-none focus:border-primary disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="px-3 py-2 bg-destructive/10 border border-destructive rounded text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !passphrase}
                        className="px-4 py-3 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        {import.meta.env.VITE_DEMO_MODE === 'true'
                            ? "Demo server running in-browser (no backend server required)."
                            : "The passphrase was displayed during installation."}
                    </p>
                </div>
            </div>
        </div>
    );
}

