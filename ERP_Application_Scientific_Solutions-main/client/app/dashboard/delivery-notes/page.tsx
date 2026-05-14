'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Truck } from 'lucide-react';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
    DRAFT:     'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    READY:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SHIPPED:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export default function DeliveryNotesPage() {
    const [notes, setNotes]       = useState<any[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => { fetchNotes(); }, [statusFilter]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/delivery-notes', { params });
            setNotes(res.data);
        } catch { } finally { setLoading(false); }
    };

    const filtered = notes.filter(n => {
        const q = search.toLowerCase();
        return !q ||
            n.deliveryNumber?.toLowerCase().includes(q) ||
            n.company?.name?.toLowerCase().includes(q) ||
            n.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
            n.trackingNumber?.toLowerCase().includes(q);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Notes</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Shipping documents and delivery tracking</p>
                </div>
                <Link href="/dashboard/delivery-notes/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" /> New Delivery Note
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search delivery notes..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="">All Statuses</option>
                    <option value="DRAFT">Draft</option>
                    <option value="READY">Ready</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">No delivery notes found</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs">
                            <tr>
                                <th className="px-5 py-3 text-left font-medium">Number</th>
                                <th className="px-5 py-3 text-left font-medium">Client</th>
                                <th className="px-5 py-3 text-left font-medium">Invoice</th>
                                <th className="px-5 py-3 text-left font-medium">Carrier</th>
                                <th className="px-5 py-3 text-left font-medium">Tracking</th>
                                <th className="px-5 py-3 text-center font-medium">Status</th>
                                <th className="px-5 py-3 text-right font-medium">Delivery Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filtered.map(n => (
                                <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-5 py-3">
                                        <Link href={`/dashboard/delivery-notes/${n.id}`} className="flex items-center gap-1.5 text-blue-600 hover:underline font-medium">
                                            <Truck className="w-3.5 h-3.5" /> {n.deliveryNumber}
                                        </Link>
                                    </td>
                                    <td className="px-5 py-3 text-gray-900 dark:text-white">{n.company?.name || '—'}</td>
                                    <td className="px-5 py-3">
                                        {n.invoice ? (
                                            <Link href={`/dashboard/invoices/${n.invoice.id}`} className="text-blue-600 hover:underline text-xs">
                                                #{n.invoice.invoiceNumber}
                                            </Link>
                                        ) : '—'}
                                    </td>
                                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{n.carrier || '—'}</td>
                                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 text-xs font-mono">{n.trackingNumber || '—'}</td>
                                    <td className="px-5 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[n.status] || ''}`}>
                                            {n.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-right text-gray-500 text-xs">
                                        {n.deliveryDate ? new Date(n.deliveryDate).toLocaleDateString() : '—'}
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
