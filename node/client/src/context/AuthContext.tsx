import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    token: string | null;
    login: (passphrase: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(
        localStorage.getItem('auth_token')
    );
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (token) {
            // Verify token is still valid
            fetch('/api/auth/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    setIsAuthenticated(data.authenticated);
                    setIsLoading(false);
                })
                .catch(() => {
                    setIsAuthenticated(false);
                    setToken(null);
                    localStorage.removeItem('auth_token');
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
    }, [token]);

    const login = async (passphrase: string) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Invalid passphrase');
        }

        const { token } = await res.json();
        localStorage.setItem('auth_token', token);
        setToken(token);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
