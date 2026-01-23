'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    drugClass, // Using a specific icon name instead of 'LayoutDashboard' if needed, but standard lucide imports usually stick to PascalCase names. Wait, 'LayoutDashboard' is correct.
    LayoutDashboard,
    Building2,
    Users,
    Package,
    Briefcase,
    FileText,
    Receipt,
    Settings,
    LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Companies', href: '/dashboard/companies', icon: Building2 },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
    { name: 'Projects', href: '/dashboard/projects', icon: Briefcase },
    { name: 'Offers', href: '/dashboard/offers', icon: FileText },
    { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 transition-all duration-300">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-200 dark:border-gray-700">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-lg">
                    Scientific ERP
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href; // Exact match for now, or startsWith for nested routes
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
