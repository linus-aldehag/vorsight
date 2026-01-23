import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '@/lib/axios';

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
            api.get('/auth/status')
                .then(res => {
                    setIsAuthenticated(res.data.authenticated);
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
        try {
            const res = await api.post('/auth/login', { passphrase });
            const { token } = res.data;
            localStorage.setItem('auth_token', token);
            setToken(token);
            setIsAuthenticated(true);
        } catch (error: any) {
            const errorData = error.response?.data || { error: 'Invalid passphrase' };
            throw new Error(errorData.error || 'Invalid passphrase');
        }
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
