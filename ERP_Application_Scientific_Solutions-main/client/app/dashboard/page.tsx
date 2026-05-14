'use client';

import { useState, useEffect } from 'react';
import {
    TrendingUp,
    Users,
    Package,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Activity
} from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState<any>({
        revenue: { value: 0, change: '0%', changeType: 'neutral' },
        projects: { value: 0, change: '0', changeType: 'neutral' },
        lowStock: { value: 0, change: '0', changeType: 'neutral' },
        users: { value: 0, change: '0', changeType: 'neutral' }
    });
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, activityRes] = await Promise.all([
                    api.get('/dashboard/stats'),
                    api.get('/dashboard/activity')
                ]);
                setStats(statsRes.data);
                setRecentActivity(activityRes.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const statCards = [
        {
            name: 'Total Revenue',
            value: `₹${Number(stats.revenue.value).toLocaleString()}`,
            change: stats.revenue.change,
            changeType: stats.revenue.changeType,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-100 dark:bg-green-900/30',
        },
        {
            name: 'Active Projects',
            value: stats.projects.value,
            change: stats.projects.change,
            changeType: stats.projects.changeType,
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            name: 'Low Stock Items',
            value: stats.lowStock.value,
            change: stats.lowStock.change,
            changeType: stats.lowStock.changeType,
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            name: 'Total Users',
            value: stats.users.value,
            change: stats.users.change,
            changeType: stats.users.changeType,
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Dashboard Overview
                </h1>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    Download Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            {/* <div className={`flex items-center gap-1 text-sm font-medium ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                                {stat.change}
                                {stat.changeType === 'increase' ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                )}
                            </div> */}
                        </div>
                        <div className="mt-4">
                            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {stat.name}
                            </h3>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                {stat.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Recent Activity
                    </h2>
                    <div className="space-y-4">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-300 shrink-0">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900 dark:text-white">
                                            <span className="font-medium">{activity.user}</span>{' '}
                                            {activity.action}{' '}
                                            <span className="font-medium text-blue-600 dark:text-blue-400">
                                                {activity.target}
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {new Date(activity.time).toLocaleString()} • {activity.details}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">No recent activity found.</p>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/dashboard/inventory/new" className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 group">
                            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Add Product</span>
                        </Link>
                        <Link href="/dashboard/contacts/new" className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 group">
                            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New Contact</span>
                        </Link>
                        <Link href="/dashboard/invoices/new" className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 group">
                            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New Invoice</span>
                        </Link>
                        <Link href="/dashboard/offers/new" className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600 group">
                            <Clock className="w-6 h-6 text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">New Offer</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
