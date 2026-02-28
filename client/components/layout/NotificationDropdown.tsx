'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, FileText, Receipt, Briefcase, Package, AlertTriangle, X, Clock } from 'lucide-react';
import api from '@/lib/api';

interface Activity {
    id: string;
    type: string;
    action: string;
    target: string;
    user: string;
    time: string;
    details: string;
}

const typeIcons: Record<string, any> = {
    INVOICE: Receipt,
    OFFER: FileText,
    PROJECT: Briefcase,
    LOW_STOCK: Package,
};

const typeColors: Record<string, string> = {
    INVOICE: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    OFFER: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    PROJECT: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    LOW_STOCK: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
};

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [lowStock, setLowStock] = useState(0);
    const [loading, setLoading] = useState(false);
    const [hasNew, setHasNew] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const [activityRes, statsRes] = await Promise.all([
                api.get('/dashboard/activity'),
                api.get('/dashboard/stats'),
            ]);
            setActivities(activityRes.data || []);
            setLowStock(statsRes.data?.lowStock?.value || 0);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleDropdown = () => {
        if (!isOpen) {
            fetchNotifications();
            setHasNew(false);
        }
        setIsOpen(!isOpen);
    };

    // Build combined notifications list
    const notifications: Activity[] = [
        ...(lowStock > 0
            ? [{
                id: 'low-stock',
                type: 'LOW_STOCK',
                action: 'Low stock alert',
                target: `${lowStock} item${lowStock > 1 ? 's' : ''} below minimum level`,
                user: 'System',
                time: new Date().toISOString(),
                details: 'Check inventory',
            }]
            : []),
        ...activities,
    ];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={toggleDropdown}
                className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5" />
                {hasNew && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                                <p className="text-xs text-gray-400">Loading...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {notifications.map((notif) => {
                                    const Icon = typeIcons[notif.type] || Bell;
                                    const colorClass = typeColors[notif.type] || 'text-gray-500 bg-gray-50 dark:bg-gray-700';

                                    return (
                                        <div
                                            key={notif.id}
                                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 dark:text-white">
                                                    <span className="font-medium">{notif.user}</span>
                                                    {' '}{notif.action}{' '}
                                                    <span className="font-medium text-blue-600 dark:text-blue-400">{notif.target}</span>
                                                </p>
                                                {notif.details && (
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.details}</p>
                                                )}
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-xs text-gray-400">{timeAgo(notif.time)}</span>
                                                </div>
                                            </div>
                                            {notif.type === 'LOW_STOCK' && (
                                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-1" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                                Showing {notifications.length} recent notification{notifications.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
