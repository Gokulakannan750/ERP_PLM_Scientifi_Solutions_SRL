'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function NewCreditNotePage() {
    const router       = useRouter();
    const searchParams = useSearchParams();
    const preInvoiceId = searchParams.get('invoiceId') || '';

    const [invoices, setInvoices]   = useState<any[]>([]);
    const [invoiceId, setInvoiceId] = useState(preInvoiceId);
    const [reason, setReason]       = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [items, setItems]         = useState([{ description: '', quantity: 1, unitPrice: 0 }]);

    useEffect(() => {
        api.get('/invoices').then(r => setInvoices(r.data)).catch(() => {});
    }, []);

    const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const handleItemChange = (index: number, field: string, value: any) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceId) { setError('Please select an invoice.'); return; }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/credit-notes', { invoiceId: parseInt(invoiceId), reason, items });
            router.push(`/dashboard/credit-notes/${res.data.id}`);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to create credit note.');
        } finally { setLoading(false); }
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/credit-notes" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Credit Note</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credit Note Details</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Original Invoice *</label>
                        <select required value={invoiceId} onChange={e => setInvoiceId(e.target.value)} className={inputCls}>
                            <option value="">Select invoice...</option>
                            {invoices.map(inv => (
                                <option key={inv.id} value={inv.id}>
                                    #{inv.invoiceNumber} — {inv.company?.name} — ₹{Number(inv.totalAmount).toFixed(2)} ({inv.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Credit Note</label>
                        <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Returned goods, billing error, partial refund..."
                            className={inputCls} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
                        <button type="button" onClick={() => setItems(p => [...p, { description: '', quantity: 1, unitPrice: 0 }])}
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
                            <Plus className="w-4 h-4" /> Add Line
                        </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 pb-2 border-b border-gray-200 dark:border-gray-700 mb-2">
                        <div className="col-span-6">Description</div>
                        <div className="col-span-2 text-center">Qty</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-1" />
                    </div>

                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center mb-2">
                            <div className="col-span-6">
                                <input type="text" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)}
                                    placeholder="Item description" className={inputCls} />
                            </div>
                            <div className="col-span-2">
                                <input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                    className={`${inputCls} text-center`} />
                            </div>
                            <div className="col-span-2">
                                <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                    className={`${inputCls} text-right`} />
                            </div>
                            <div className="col-span-1 text-right text-sm font-medium text-red-600">
                                ₹{(item.quantity * item.unitPrice).toFixed(2)}
                            </div>
                            <div className="col-span-1 text-center">
                                {items.length > 1 && (
                                    <button type="button" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                                        className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                            Credit Total: - ₹{total.toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => router.back()}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        Create Credit Note
                    </button>
                </div>
            </form>
        </div>
    );
}
