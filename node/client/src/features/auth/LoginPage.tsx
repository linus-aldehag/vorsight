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
                            placeholder="Enter your passphrase"
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
                        The passphrase was displayed during installation.
                    </p>
                </div>
            </div>
        </div>
    );
}

