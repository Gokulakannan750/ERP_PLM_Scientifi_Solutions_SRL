import { jwtDecode } from 'jwt-decode';

export interface User {
    id: number;
    email: string;
    role: string;
    name?: string;
    permissions?: Array<{ id: number; name: string; description: string; category: string }>;
}

export interface DecodedToken {
    userId: number;
    email: string;
    role: string;
    iat: number;
    exp: number;
}

export const setAuthToken = (token: string) => {
    localStorage.setItem('token', token);
};

export const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const removeAuthToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const setStoredUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getStoredUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export const decodeToken = (token: string): DecodedToken | null => {
    try {
        return jwtDecode<DecodedToken>(token);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

export const isTokenExpired = (token: string): boolean => {
    const decoded = decodeToken(token);
    if (!decoded) return true;

    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
};

export const getCurrentUser = (): User | null => {
    const token = getAuthToken();
    if (!token || isTokenExpired(token)) {
        removeAuthToken();
        return null;
    }

    // Prefer the stored full user object (includes permissions, name)
    const stored = getStoredUser();
    if (stored) return stored;

    // Fallback: decode token (handles both user_id and userId field names)
    const decoded = decodeToken(token);
    if (!decoded) return null;

    return {
        id: (decoded as any).user_id ?? decoded.userId,
        email: decoded.email,
        role: decoded.role,
    };
};
