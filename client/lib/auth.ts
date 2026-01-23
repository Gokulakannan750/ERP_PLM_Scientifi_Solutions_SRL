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
        return null;
    }

    const decoded = decodeToken(token);
    if (!decoded) return null;

    return {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
    };
};
