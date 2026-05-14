'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Zap } from 'lucide-react';
import api from '@/lib/api';

interface DNItem {
    description: string;
    quantity:    string;
    unitOfMeasure: string;
    productId:   string;
    serialNumbers: string;
    batchNumber:   string;
    notes:         string;
}

const blankItem = (): DNItem => ({
    description: '', quantity: '1', unitOfMeasure: 'units',
    productId: '', serialNumbers: '', batchNumber: '', notes: '',
});

export default function NewDeliveryNotePage() {
    const router = useRouter();
    const sp     = useSearchParams();
    const [saving, setSaving]     = useState(false);
    const [generating, setGenerating] = useState(false);
    const [companies, setCompanies]   = useState<any[]>([]);
    const [invoices, setInvoices]     = useState<any[]>([]);
    const [projects, setProjects]     = useState<any[]>([]);
    const [products, setProducts]     = useState<any[]>([]);
    const [items, setItems]           = useState<DNItem[]>([blankItem()]);

    const [form, setForm] = useState({
        companyId:        '',
        invoiceId:        sp.get('invoiceId') || '',
        projectId:        '',
        deliveryDate:     '',
        customerPoNumber: '',
        customerPoDate:   '',
        carrier:          '',
        trackingNumber:   '',
        incoterms:        '',
        packageType:      '',
        packageCount:     '',
        weightKg:         '',
        dimensionL:       '',
        dimensionW:       '',
        dimensionH:       '',
        deliveryAddress:  '',
        notes:            '',
    });

    useEffect(() => {
        Promise.all([
            api.get('/companies'),
            api.get('/invoices'),
            api.get('/projects'),
            api.get('/inventory'),
        ]).then(([c, inv, pr, prod]) => {
            setCompanies(c.data);
            setInvoices(inv.data);
            setProjects(pr.data);
            setProducts(prod.data);
        }).catch(() => {});
    }, []);

    const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const setItem = (i: number, field: keyof DNItem, value: string) => {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
    };

    const handleGenerateFromInvoice = async () => {
        if (!form.invoiceId) { alert('Select an invoice first'); return; }
        setGenerating(true);
        try {
            const res = await api.post('/delivery-notes/from-invoice', { invoiceId: form.invoiceId });
            router.push(`/dashboard/delivery-notes/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to generate');
        } finally { setGenerating(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.companyId) { alert('Please select a client'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                companyId:   form.companyId,
                invoiceId:   form.invoiceId || undefined,
                projectId:   form.projectId || undefined,
                packageCount: form.packageCount || undefined,
                weightKg:     form.weightKg || undefined,
                dimensionL:   form.dimensionL || undefined,
                dimensionW:   form.dimensionW || undefined,
                dimensionH:   form.dimensionH || undefined,
                items: items.filter(it => it.description.trim()).map(it => ({
                    ...it,
                    productId: it.productId || undefined,
                    serialNumbers: it.serialNumbers || undefined,
                    batchNumber:   it.batchNumber   || undefined,
                    notes:         it.notes         || undefined,
                })),
            };
            const res = await api.post('/delivery-notes', payload);
            router.push(`/dashboard/delivery-notes/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to create');
        } finally { setSaving(false); }
    };

    const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
    const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/delivery-notes" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Delivery Note</h1>
            </div>

            {/* Auto-generate shortcut */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300 flex-1">Auto-generate from an invoice (pre-fills items from invoice lines)</p>
                <select value={form.invoiceId} onChange={e => set('invoiceId', e.target.value)}
                    className="px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <option value="">— Select invoice —</option>
                    {invoices.map((inv: any) => (
                        <option key={inv.id} value={inv.id}>#{inv.invoiceNumber} — {inv.company?.name}</option>
                    ))}
                </select>
                <button onClick={handleGenerateFromInvoice} disabled={generating || !form.invoiceId}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {generating ? 'Generating...' : 'Generate'}
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client & Refs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Client & References</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Client *</label>
                            <select value={form.companyId} onChange={e => set('companyId', e.target.value)} required className={inputClass}>
                                <option value="">— Select client —</option>
                                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Linked Invoice</label>
                            <select value={form.invoiceId} onChange={e => set('invoiceId', e.target.value)} className={inputClass}>
                                <option value="">— None —</option>
                                {invoices.map((inv: any) => <option key={inv.id} value={inv.id}>#{inv.invoiceNumber}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Project</label>
                            <select value={form.projectId} onChange={e => set('projectId', e.target.value)} className={inputClass}>
                                <option value="">— None —</option>
                                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Customer PO Number</label>
                            <input type="text" value={form.customerPoNumber} onChange={e => set('customerPoNumber', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Customer PO Date</label>
                            <input type="date" value={form.customerPoDate} onChange={e => set('customerPoDate', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Delivery Date</label>
                            <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Delivery Address</label>
                        <textarea value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} rows={2} className={inputClass} />
                    </div>
                </div>

                {/* Shipping */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Shipping Details</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Carrier</label>
                            <input type="text" value={form.carrier} onChange={e => set('carrier', e.target.value)} className={inputClass} placeholder="FedEx, DHL..." />
                        </div>
                        <div>
                            <label className={labelClass}>Tracking Number</label>
                            <input type="text" value={form.trackingNumber} onChange={e => set('trackingNumber', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Incoterms</label>
                            <select value={form.incoterms} onChange={e => set('incoterms', e.target.value)} className={inputClass}>
                                <option value="">— None —</option>
                                {['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Package Type</label>
                            <select value={form.packageType} onChange={e => set('packageType', e.target.value)} className={inputClass}>
                                <option value="">— None —</option>
                                <option value="WOOD_CRATE">Wood Crate</option>
                                <option value="PALLET">Pallet</option>
                                <option value="CARDBOARD_BOX">Cardboard Box</option>
                                <option value="CUSTOM">Custom</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Package Count</label>
                            <input type="number" min="1" value={form.packageCount} onChange={e => set('packageCount', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Weight (kg)</label>
                            <input type="number" step="any" min="0" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Length (cm)</label>
                            <input type="number" step="any" min="0" value={form.dimensionL} onChange={e => set('dimensionL', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Width (cm)</label>
                            <input type="number" step="any" min="0" value={form.dimensionW} onChange={e => set('dimensionW', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Height (cm)</label>
                            <input type="number" step="any" min="0" value={form.dimensionH} onChange={e => set('dimensionH', e.target.value)} className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Line Items</h2>
                        <button type="button" onClick={() => setItems(prev => [...prev, blankItem()])}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <Plus className="w-4 h-4" /> Add Item
                        </button>
                    </div>
                    <div className="space-y-3">
                        {items.map((item, i) => (
                            <div key={i} className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-lg space-y-3">
                                <div className="grid grid-cols-12 gap-3 items-start">
                                    <div className="col-span-5">
                                        <input type="text" value={item.description} onChange={e => setItem(i, 'description', e.target.value)}
                                            placeholder="Description" className={inputClass} />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="number" step="any" min="0" value={item.quantity} onChange={e => setItem(i, 'quantity', e.target.value)}
                                            placeholder="Qty" className={inputClass} />
                                    </div>
                                    <div className="col-span-2">
                                        <input type="text" value={item.unitOfMeasure} onChange={e => setItem(i, 'unitOfMeasure', e.target.value)}
                                            placeholder="Unit" className={inputClass} />
                                    </div>
                                    <div className="col-span-2">
                                        <select value={item.productId} onChange={e => {
                                            const p = products.find(pr => String(pr.id) === e.target.value);
                                            setItem(i, 'productId', e.target.value);
                                            if (p && !item.description) setItem(i, 'description', p.name);
                                        }} className={inputClass}>
                                            <option value="">— Product —</option>
                                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-end pt-1">
                                        <button type="button" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                                            className="text-red-500 hover:text-red-700">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" value={item.serialNumbers} onChange={e => setItem(i, 'serialNumbers', e.target.value)}
                                        placeholder="Serial numbers (comma-separated)" className={inputClass} />
                                    <input type="text" value={item.batchNumber} onChange={e => setItem(i, 'batchNumber', e.target.value)}
                                        placeholder="Batch / Lot number" className={inputClass} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Internal Notes</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inputClass} />
                </div>

                <div className="flex justify-end gap-3">
                    <Link href="/dashboard/delivery-notes" className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </Link>
                    <button type="submit" disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                        {saving ? 'Creating...' : 'Create Delivery Note'}
                    </button>
                </div>
            </form>
        </div>
    );
}
