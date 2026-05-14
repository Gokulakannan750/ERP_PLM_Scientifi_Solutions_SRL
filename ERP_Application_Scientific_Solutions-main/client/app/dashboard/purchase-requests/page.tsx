'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ArrowUpRight, ArrowDownLeft, Filter, Search } from 'lucide-react';
import api from '@/lib/api';

export default function PurchaseRequestsPage() {
    const [requests, setRequests] = useState<any[]>([]);
    const [stats, setStats]       = useState<any>(null);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [dirFilter, setDirFilter]   = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchData();
    }, [dirFilter, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (dirFilter)    params.direction = dirFilter;
            if (statusFilter) params.status    = statusFilter;
            const [reqRes, statRes] = await Promise.all([
                api.get('/purchase-requests', { params }),
                api.get('/purchase-requests/stats'),
            ]);
            setRequests(reqRes.data);
            setStats(statRes.data);
        } catch { } finally { setLoading(false); }
    };

    const filtered = requests.filter(r => {
        const q = search.toLowerCase();
        return !q ||
            r.requestNumber?.toLowerCase().includes(q) ||
            r.product?.name?.toLowerCase().includes(q) ||
            r.freeTextDescription?.toLowerCase().includes(q) ||
            r.company?.name?.toLowerCase().includes(q);
    });

    const statusColors: Record<string, string> = {
        RAISED:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        APPROVED:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        ORDERED:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        RECEIVED:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
        CANCELLED:    'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
    };

    const priorityColors: Record<string, string> = {
        LOW:    'text-gray-500',
        MEDIUM: 'text-amber-500',
        URGENT: 'text-red-500 font-semibold',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request Management</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Purchase requests and customer inquiries</p>
                </div>
                <Link href="/dashboard/purchase-requests/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" /> New Request
                </Link>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500 mb-1">Total Requests</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                        <p className="text-xs text-gray-500 mb-1">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
                    </div>
                    {stats.byDirection?.map((d: any) => (
                        <div key={d.direction} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-1.5 mb-1">
                                {d.direction === 'OUTBOUND'
                                    ? <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                                    : <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />}
                                <p className="text-xs text-gray-500">{d.direction}</p>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{d._count.id}</p>
                            {d._sum.totalEstimatedCost && (
                                <p className="text-xs text-gray-400 mt-0.5">₹{Number(d._sum.totalEstimatedCost).toLocaleString()}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <select value={dirFilter} onChange={e => setDirFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">All Directions</option>
                    <option value="OUTBOUND">Outbound (Procurement)</option>
                    <option value="INBOUND">Inbound (Inquiry)</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">All Statuses</option>
                    <option value="RAISED">Raised</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">No requests found</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs">
                            <tr>
                                <th className="px-5 py-3 text-left font-medium">Number</th>
                                <th className="px-5 py-3 text-left font-medium">Direction</th>
                                <th className="px-5 py-3 text-left font-medium">Item</th>
                                <th className="px-5 py-3 text-left font-medium">Company</th>
                                <th className="px-5 py-3 text-center font-medium">Priority</th>
                                <th className="px-5 py-3 text-right font-medium">Est. Cost</th>
                                <th className="px-5 py-3 text-center font-medium">Status</th>
                                <th className="px-5 py-3 text-right font-medium">Required By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.map(r => (
                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-5 py-3">
                                        <Link href={`/dashboard/purchase-requests/${r.id}`} className="text-blue-600 hover:underline font-medium">
                                            {r.requestNumber}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="flex items-center gap-1">
                                            {r.direction === 'OUTBOUND'
                                                ? <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                                                : <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />}
                                            <span className="text-gray-600 dark:text-gray-300">{r.direction === 'OUTBOUND' ? 'Procurement' : 'Inquiry'}</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-900 dark:text-white max-w-xs truncate">
                                        {r.product?.name || r.freeTextDescription || '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{r.company?.name || '—'}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`text-xs ${priorityColors[r.priority] || ''}`}>{r.priority}</span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-300">
                                        {r.totalEstimatedCost ? `₹${Number(r.totalEstimatedCost).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] || ''}`}>
                                            {r.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                                        {r.requiredByDate ? new Date(r.requiredByDate).toLocaleDateString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
