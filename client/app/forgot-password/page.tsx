'use client';

import Link from 'next/link';
import { Atom, ArrowLeft, ShieldAlert, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
    return (
        <div className="login-page min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Animated Background */}
            <div className="login-bg absolute inset-0" />

            {/* Floating Shapes */}
            <div className="login-shape login-shape-1" />
            <div className="login-shape login-shape-2" />
            <div className="login-shape login-shape-3" />

            {/* Main Content */}
            <div className="login-card-wrapper relative z-10 w-full max-w-md px-6">
                {/* Logo */}
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

                {/* Card */}
                <div className="login-card">
                    <div className="p-8 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-2xl mb-5">
                            <ShieldAlert className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                        </div>

                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Reset Your Password
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                            For security reasons, password resets must be performed by a system administrator.
                            Please contact your admin to get your password reset.
                        </p>

                        {/* Admin Contact */}
                        <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 mb-6">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Contact Admin</span>
                            </div>
                            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                                Reach out to your system administrator or email
                            </p>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mt-1">
                                admin@scientificsolutions.com
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="login-btn inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-400 mt-8">
                    © 2026 Scientific Solutions. All rights reserved.
                </p>
            </div>
        </div>
    );
}
