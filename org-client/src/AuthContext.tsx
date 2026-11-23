import { createContext, useContext, useState, type ReactNode } from 'react';
import type { AuthUser } from './types';

interface AuthContextType {
    user: AuthUser | null;
    login: (authData: AuthUser) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        const saved = localStorage.getItem('org_auth');
        return saved ? JSON.parse(saved) : null;
    });

    const login = (authData: AuthUser) => {
        localStorage.setItem('org_auth', JSON.stringify(authData));
        setUser(authData);
    };

    const logout = () => {
        localStorage.removeItem('org_auth');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth yalnızca AuthProvider içinde kullanılabilir.');
    return ctx;
}