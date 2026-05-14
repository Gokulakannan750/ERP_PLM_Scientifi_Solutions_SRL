'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    Users,
    Package,
    Layers,
    Briefcase,
    FileText,
    Receipt,
    TrendingUp,
    FileX,
    Settings,
    LogOut,
    ShoppingCart,
    Truck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: null }, // Always visible
    { name: 'Companies', href: '/dashboard/companies', icon: Building2, permission: ['MANAGE_COMPANIES', 'VIEW_COMPANIES'] },
    { name: 'Contacts', href: '/dashboard/contacts', icon: Users, permission: ['MANAGE_CONTACTS', 'VIEW_CONTACTS'] },
    { name: 'Inventory', href: '/dashboard/inventory', icon: Package, permission: ['MANAGE_INVENTORY', 'VIEW_INVENTORY'] },
    { name: 'PLM', href: '/dashboard/plm', icon: Layers, permission: ['MANAGE_INVENTORY', 'VIEW_INVENTORY'] },
    { name: 'Projects', href: '/dashboard/projects', icon: Briefcase, permission: ['MANAGE_PROJECTS', 'VIEW_PROJECTS'] },
    { name: 'Offers', href: '/dashboard/offers', icon: FileText, permission: ['CREATE_OFFERS', 'VIEW_OFFER_HISTORY', 'EDIT_OFFERS'] },
    { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt, permission: ['MANAGE_INVOICES', 'VIEW_INVOICES'] },
    { name: 'Revenue', href: '/dashboard/invoices/revenue', icon: TrendingUp, permission: ['MANAGE_INVOICES', 'VIEW_INVOICES'] },
    { name: 'Credit Notes', href: '/dashboard/credit-notes', icon: FileX, permission: ['MANAGE_INVOICES', 'VIEW_INVOICES'] },
    { name: 'Requests', href: '/dashboard/purchase-requests', icon: ShoppingCart, permission: ['MANAGE_INVENTORY', 'VIEW_INVENTORY'] },
    { name: 'Deliveries', href: '/dashboard/delivery-notes', icon: Truck, permission: ['MANAGE_INVOICES', 'VIEW_INVOICES'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, permission: null }, // Always visible
];

export default function Sidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();

    // Check if user has permission to access a menu item
    const hasPermission = (requiredPermissions: string[] | null) => {
        // No permission required - always show
        if (!requiredPermissions) return true;

        // Admin has access to everything
        if (user?.role === 'ADMIN') return true;

        // Check if user has any of the required permissions
        if (!user?.permissions || user.permissions.length === 0) return false;

        return requiredPermissions.some(perm =>
            user?.permissions?.some((up: any) => up.name === perm)
        );
    };

    // Filter navigation based on permissions
    const visibleNavigation = navigation.filter(item => hasPermission(item.permission));

    return (
        <div className="flex flex-col h-full bg-sidebar-bg border-r border-gray-800 w-64 transition-all duration-300">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-800">
                <div className="w-8 h-8 bg-status-info rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-white text-lg">
                    Scientific ERP
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {visibleNavigation.map((item) => {
                    const isActive = item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* User & Logout */}
            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
