'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, Clock } from 'lucide-react';
import api from '@/lib/api';

interface RevenueData {
    totalRevenue: number;
    outstanding: number;
    byPeriod: { period: string; revenue: number; count: number }[];
    byClient: { clientName: string; companyId: number; revenue: number; outstanding: number; count: number }[];
}

export default function RevenuePage() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [groupBy, setGroupBy] = useState<'month' | 'year'>('month');

    useEffect(() => { fetchRevenue(); }, [groupBy]);

    const fetchRevenue = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/invoices/revenue?groupBy=${groupBy}`);
            setData(res.data);
        } catch { } finally { setLoading(false); }
    };

    const maxPeriodRevenue = data?.byPeriod.length
        ? Math.max(...data.byPeriod.map(p => p.revenue), 1)
        : 1;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/invoices" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp className="w-6 h-6 text-green-500" /> Revenue Report
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Paid invoice revenue analysis</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Group by:</span>
                    <select
                        value={groupBy}
                        onChange={e => setGroupBy(e.target.value as 'month' | 'year')}
                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="month">Month</option>
                        <option value="year">Year</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : data ? (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium">Total Revenue (Paid)</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                ₹{Number(data.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                                <Clock className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-medium">Outstanding (Unpaid / Overdue)</span>
                            </div>
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                ₹{Number(data.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Revenue by period */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                            Revenue by {groupBy === 'month' ? 'Month' : 'Year'}
                        </h2>
                        {data.byPeriod.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No paid invoices found.</p>
                        ) : (
                            <div className="space-y-3">
                                {data.byPeriod.map(p => (
                                    <div key={p.period} className="flex items-center gap-4">
                                        <div className="w-24 flex-shrink-0 text-sm text-gray-600 dark:text-gray-300 font-medium">
                                            {p.period}
                                        </div>
                                        <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden relative">
                                            <div
                                                className="h-full bg-green-500 rounded-full transition-all"
                                                style={{ width: `${(p.revenue / maxPeriodRevenue) * 100}%` }}
                                            />
                                        </div>
                                        <div className="w-36 flex-shrink-0 text-right">
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                ₹{Number(p.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">({p.count} inv)</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Revenue by client */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Client</h2>
                        </div>
                        {data.byClient.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center p-8">No data available.</p>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Client</th>
                                        <th className="px-6 py-3 font-medium text-right">Invoices</th>
                                        <th className="px-6 py-3 font-medium text-right">Revenue (Paid)</th>
                                        <th className="px-6 py-3 font-medium text-right">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {data.byClient.map(c => (
                                        <tr key={c.companyId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <Link href={`/dashboard/companies/${c.companyId}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 text-sm">
                                                    {c.clientName}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-600 dark:text-gray-300">{c.count}</td>
                                            <td className="px-6 py-4 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                                                ₹{Number(c.revenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-amber-600 dark:text-amber-400">
                                                ₹{Number(c.outstanding).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                <p className="text-center text-gray-500 py-12">Failed to load revenue data.</p>
            )}
        </div>
    );
}
