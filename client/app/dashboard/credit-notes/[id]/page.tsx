'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, FileCheck, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function CreditNotePage() {
    const { id } = useParams();
    const router  = useRouter();
    const [cn, setCn]       = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing]   = useState(false);

    useEffect(() => { fetchCN(); }, [id]);

    const fetchCN = async () => {
        try { const r = await api.get(`/credit-notes/${id}`); setCn(r.data); }
        catch { } finally { setLoading(false); }
    };

    const handleIssue = async () => {
        setActing(true);
        try {
            await api.post(`/credit-notes/${id}/issue`);
            setCn((p: any) => ({ ...p, status: 'ISSUED', issuedAt: new Date().toISOString() }));
        } catch { alert('Failed to issue'); } finally { setActing(false); }
    };

    const handleApply = async () => {
        if (!confirm('Apply this credit note? It will reduce the original invoice total.')) return;
        setActing(true);
        try {
            await api.post(`/credit-notes/${id}/apply`);
            setCn((p: any) => ({ ...p, status: 'APPLIED' }));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to apply');
        } finally { setActing(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this credit note?')) return;
        try {
            await api.delete(`/credit-notes/${id}`);
            router.push('/dashboard/credit-notes');
        } catch (err: any) { alert(err.response?.data?.error || 'Failed to delete'); }
    };

    if (loading) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    if (!cn) return <div className="text-center p-12 text-gray-500">Credit note not found.</div>;

    const statusColors: Record<string, string> = {
        DRAFT:   'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
        ISSUED:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        APPLIED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/credit-notes" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Note</h1>
                        <p className="text-sm text-gray-500">{cn.creditNoteNumber}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[cn.status] || statusColors.DRAFT}`}>
                        {cn.status}
                    </span>
                    {cn.status === 'DRAFT' && (
                        <>
                            <button onClick={handleIssue} disabled={acting}
                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                <FileCheck className="w-4 h-4" /> {acting ? 'Issuing...' : 'Issue'}
                            </button>
                            <button onClick={handleDelete}
                                className="flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </>
                    )}
                    {cn.status === 'ISSUED' && (
                        <button onClick={handleApply} disabled={acting}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                            <CheckCircle className="w-4 h-4" /> {acting ? 'Applying...' : 'Apply to Invoice'}
                        </button>
                    )}
                </div>
            </div>

            {cn.status === 'APPLIED' && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
                    This credit note has been applied to invoice <Link href={`/dashboard/invoices/${cn.invoice?.id}`} className="font-bold underline">#{cn.invoice?.invoiceNumber}</Link>.
                </div>
            )}

            {/* Details */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500">Original Invoice:</span>
                        <Link href={`/dashboard/invoices/${cn.invoice?.id}`} className="ml-2 text-blue-600 font-medium">
                            #{cn.invoice?.invoiceNumber}
                        </Link>
                    </div>
                    <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{cn.company?.name}</span>
                    </div>
                    <div>
                        <span className="text-gray-500">Created:</span>
                        <span className="ml-2 text-gray-700 dark:text-gray-300">{new Date(cn.createdAt).toLocaleDateString()}</span>
                    </div>
                    {cn.issuedAt && (
                        <div>
                            <span className="text-gray-500">Issued:</span>
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{new Date(cn.issuedAt).toLocaleDateString()}</span>
                        </div>
                    )}
                    {cn.reason && (
                        <div className="col-span-2">
                            <span className="text-gray-500">Reason:</span>
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{cn.reason}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items (Credit)</h2>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs">
                        <tr>
                            <th className="px-6 py-3 text-left font-medium">Description</th>
                            <th className="px-6 py-3 text-center font-medium">Qty</th>
                            <th className="px-6 py-3 text-right font-medium">Unit Price</th>
                            <th className="px-6 py-3 text-right font-medium">Credit Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {cn.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-3 text-gray-900 dark:text-white">{item.description}</td>
                                <td className="px-6 py-3 text-center text-gray-600 dark:text-gray-300">{item.quantity}</td>
                                <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-300">₹{Number(item.unitPrice).toFixed(2)}</td>
                                <td className="px-6 py-3 text-right font-medium text-red-600 dark:text-red-400">- ₹{Number(item.totalPrice).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-600">
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">Total Credit:</td>
                            <td className="px-6 py-4 text-right font-bold text-xl text-red-600 dark:text-red-400">
                                - ₹{Number(cn.totalAmount).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
