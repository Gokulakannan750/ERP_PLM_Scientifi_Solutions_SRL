/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getCurrentUser, getAuthToken, removeAuthToken, setAuthToken, setStoredUser } from '@/lib/auth';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const initUser = async () => {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                setLoading(false);
                return;
            }
            // Refresh permissions from server in background
            try {
                const res = await api.get(`/admin/users/${currentUser.id}/permissions`);
                const enriched = { ...currentUser, permissions: res.data };
                setStoredUser(enriched);
                setUser(enriched);
            } catch {
                setUser(currentUser);
            }
            setLoading(false);
        };
        initUser();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user: userData } = response.data;

            setAuthToken(token);

            // Fetch permissions for this user
            let enrichedUser = userData;
            try {
                const permRes = await api.get(`/admin/users/${userData.id}/permissions`);
                enrichedUser = { ...userData, permissions: permRes.data };
            } catch { /* ignore, continue without permissions */ }

            setStoredUser(enrichedUser);
            setUser(enrichedUser);
            router.push('/dashboard');
        } catch (error: any) {
            throw new Error(error.response?.data?.message || error.response?.data?.error || 'Login failed');
        }
    };

    const logout = () => {
        removeAuthToken();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
