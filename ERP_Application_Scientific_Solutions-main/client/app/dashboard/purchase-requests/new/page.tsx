'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function NewPurchaseRequestPage() {
    const router = useRouter();
    const sp     = useSearchParams();
    const [saving, setSaving] = useState(false);
    const [companies, setCompanies] = useState<any[]>([]);
    const [products, setProducts]   = useState<any[]>([]);
    const [projects, setProjects]   = useState<any[]>([]);

    const [form, setForm] = useState({
        direction:          sp.get('direction') || 'OUTBOUND',
        type:               'INVENTORY',
        productId:          '',
        freeTextDescription: '',
        quantity:           '1',
        unitOfMeasure:      'units',
        estimatedUnitPrice: '',
        requiredByDate:     '',
        projectId:          '',
        companyId:          '',
        priority:           'MEDIUM',
        notes:              '',
    });

    useEffect(() => {
        Promise.all([
            api.get('/companies'),
            api.get('/inventory'),
            api.get('/projects'),
        ]).then(([c, p, pr]) => {
            setCompanies(c.data);
            setProducts(p.data);
            setProjects(pr.data);
        }).catch(() => {});
    }, []);

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = {
                direction:          form.direction,
                type:               form.type,
                quantity:           form.quantity,
                unitOfMeasure:      form.unitOfMeasure,
                priority:           form.priority,
                notes:              form.notes || undefined,
                estimatedUnitPrice: form.estimatedUnitPrice || undefined,
                requiredByDate:     form.requiredByDate || undefined,
                projectId:          form.projectId || undefined,
                companyId:          form.companyId || undefined,
            };
            if (form.type === 'INVENTORY' && form.productId) {
                payload.productId = form.productId;
            } else {
                payload.freeTextDescription = form.freeTextDescription;
            }
            const res = await api.post('/purchase-requests', payload);
            router.push(`/dashboard/purchase-requests/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create');
        } finally { setSaving(false); }
    };

    const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/purchase-requests" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Request</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Direction toggle */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Request Direction</h2>
                    <div className="flex gap-3">
                        {['OUTBOUND', 'INBOUND'].map(dir => (
                            <button key={dir} type="button"
                                onClick={() => set('direction', dir)}
                                className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${form.direction === dir
                                    ? dir === 'OUTBOUND'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                        : 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'}`}>
                                {dir === 'OUTBOUND' ? '↑ Outbound — We buy from supplier' : '↓ Inbound — Customer inquiry to us'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Item Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Item Details</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Type</label>
                            <select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>
                                <option value="INVENTORY">Inventory Item</option>
                                <option value="SERVICE">Service</option>
                                <option value="EQUIPMENT">Equipment</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Priority</label>
                            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputClass}>
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>
                    </div>

                    {form.type === 'INVENTORY' ? (
                        <div>
                            <label className={labelClass}>Product</label>
                            <select value={form.productId} onChange={e => set('productId', e.target.value)} className={inputClass}>
                                <option value="">— Select product or leave blank for free text —</option>
                                {products.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {(!form.productId || form.type !== 'INVENTORY') && (
                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea value={form.freeTextDescription} onChange={e => set('freeTextDescription', e.target.value)}
                                rows={2} placeholder="Describe the item or service..."
                                className={inputClass} />
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Quantity</label>
                            <input type="number" min="0" step="any" value={form.quantity} onChange={e => set('quantity', e.target.value)}
                                required className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Unit</label>
                            <input type="text" value={form.unitOfMeasure} onChange={e => set('unitOfMeasure', e.target.value)}
                                className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Est. Unit Price (₹)</label>
                            <input type="number" min="0" step="any" value={form.estimatedUnitPrice} onChange={e => set('estimatedUnitPrice', e.target.value)}
                                className={inputClass} placeholder="0.00" />
                        </div>
                    </div>
                </div>

                {/* Associations */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        {form.direction === 'OUTBOUND' ? 'Supplier & Project' : 'Customer & Project'}
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>{form.direction === 'OUTBOUND' ? 'Supplier' : 'Customer'}</label>
                            <select value={form.companyId} onChange={e => set('companyId', e.target.value)} className={inputClass}>
                                <option value="">— None —</option>
                                {companies.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Project</label>
                            <select value={form.projectId} onChange={e => set('projectId', e.target.value)} className={inputClass}>
                                <option value="">— None —</option>
                                {projects.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Required By Date</label>
                        <input type="date" value={form.requiredByDate} onChange={e => set('requiredByDate', e.target.value)}
                            className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Notes</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                            rows={2} className={inputClass} placeholder="Additional notes..." />
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Link href="/dashboard/purchase-requests" className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {saving ? 'Creating...' : 'Create Request'}
                    </button>
                </div>
            </form>
        </div>
    );
}
