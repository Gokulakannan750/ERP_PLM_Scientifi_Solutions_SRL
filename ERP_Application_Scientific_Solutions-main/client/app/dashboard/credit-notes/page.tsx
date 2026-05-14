'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, FileX, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

export default function CreditNotesPage() {
    const [creditNotes, setCreditNotes] = useState<any[]>([]);
    const [loading, setLoading]         = useState(true);

    useEffect(() => { fetchCreditNotes(); }, []);

    const fetchCreditNotes = async () => {
        try {
            const res = await api.get('/credit-notes');
            setCreditNotes(res.data);
        } catch { } finally { setLoading(false); }
    };

    const statusColors: Record<string, string> = {
        DRAFT:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        ISSUED:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        APPLIED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileX className="w-6 h-6 text-red-500" /> Credit Notes
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage refunds and adjustments against invoices</p>
                </div>
                <Link href="/dashboard/credit-notes/new"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    <Plus className="w-4 h-4" /> New Credit Note
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-sm">
                            <tr>
                                <th className="px-6 py-3 font-medium">Credit Note #</th>
                                <th className="px-6 py-3 font-medium">Original Invoice</th>
                                <th className="px-6 py-3 font-medium">Client</th>
                                <th className="px-6 py-3 font-medium">Amount</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Created</th>
                                <th className="px-6 py-3 font-medium" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {creditNotes.map(cn => (
                                <tr key={cn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white text-sm">{cn.creditNoteNumber}</td>
                                    <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400">
                                        <Link href={`/dashboard/invoices/${cn.invoice?.id}`}>#{cn.invoice?.invoiceNumber}</Link>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{cn.company?.name}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-red-600 dark:text-red-400">
                                        - ₹{Number(cn.totalAmount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[cn.status] || statusColors.DRAFT}`}>
                                            {cn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(cn.createdAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard/credit-notes/${cn.id}`}
                                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 justify-end">
                                            View <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {creditNotes.length === 0 && (
                                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No credit notes yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
