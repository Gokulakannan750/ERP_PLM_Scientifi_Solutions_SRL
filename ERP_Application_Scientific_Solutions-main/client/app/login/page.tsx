'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Atom, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Beaker, Microscope, FlaskConical } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [hasError, setHasError] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const router = useRouter();

    // Load remembered email on mount
    useEffect(() => {
        if (isAuthenticated) {
            router.push('/dashboard');
        }
        const remembered = localStorage.getItem('rememberedEmail');
        if (remembered) {
            setEmail(remembered);
            setRememberMe(true);
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setHasError(false);
        setIsLoading(true);

        try {
            // Save or clear remembered email
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            await login(email, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
            setHasError(true);
            // Reset shake animation
            setTimeout(() => setHasError(false), 600);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="login-bg absolute inset-0" />

            {/* Floating Shapes */}
            <div className="login-shape login-shape-1" />
            <div className="login-shape login-shape-2" />
            <div className="login-shape login-shape-3" />
            <div className="login-shape login-shape-4" />

            {/* Main Content */}
            <div className="login-card-wrapper relative z-10 w-full max-w-md px-6">
                {/* Logo & Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 login-logo-ring rounded-3xl mb-5 relative">
                        <div className="login-logo-inner w-16 h-16 rounded-2xl flex items-center justify-center">
                            <Atom className="w-9 h-9 text-white" strokeWidth={1.8} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-1 tracking-tight">
                        Scientific Solutions
                    </h1>
                    <p className="text-blue-500/80 text-sm font-medium tracking-wide uppercase">
                        Enterprise Resource Planning
                    </p>
                </div>

                {/* Login Form Card */}
                <div className={`login-card ${hasError ? 'login-shake' : ''}`}>
                    <div className="px-8 pt-8 pb-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Welcome Back
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Sign in to your account to continue
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-8 pb-8 pt-4 space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="login-error flex items-center gap-3 p-3.5 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Email Field */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="login-input w-full pl-11 pr-4 py-3"
                                    placeholder="you@company.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="login-input w-full pl-11 pr-12 py-3"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="login-checkbox w-4 h-4 rounded"
                                    />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                                    Remember me
                                </span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="login-btn w-full py-3 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <div className="flex items-center justify-center gap-4 mb-3">
                        <Beaker className="w-4 h-4 text-blue-400/40" />
                        <Microscope className="w-4 h-4 text-blue-400/40" />
                        <FlaskConical className="w-4 h-4 text-blue-400/40" />
                    </div>
                    <p className="text-xs text-gray-400">
                        © 2026 Scientific Solutions. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}
