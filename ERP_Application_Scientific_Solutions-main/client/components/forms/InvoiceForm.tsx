'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Company {
    id: number;
    name: string;
    vatPercentage?: number | null;
    paymentTerms?: string | null;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    price: string;
}

interface InvoiceItem {
    productId?: number;
    productName?: string;
    isSearchOpen?: boolean;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    vatPercent: number;
    totalPrice: number;
}

interface InvoiceFormProps {
    initialData?: any;
    isEditing?: boolean;
    isReadOnly?: boolean;
}

export default function InvoiceForm({ initialData, isEditing = false, isReadOnly = false }: InvoiceFormProps) {
    const router = useRouter();
    const [clients, setClients] = useState<Company[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [companyId, setCompanyId]             = useState(initialData?.companyId?.toString() || '');
    const [status, setStatus]                   = useState(initialData?.status || 'UNPAID');
    const [date, setDate]                       = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate]                 = useState(initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '');
    const [taxRate, setTaxRate]                 = useState(initialData?.taxRate?.toString() || '0');
    const [discountPercent, setDiscountPercent] = useState(initialData?.discountPercent?.toString() || '0');
    const [notes, setNotes]                     = useState(initialData?.notes || '');
    const [poNumber, setPoNumber]               = useState(initialData?.poNumber || '');
    const [poDate, setPoDate]                   = useState(initialData?.poDate ? new Date(initialData.poDate).toISOString().split('T')[0] : '');
    const [paymentMethod, setPaymentMethod]     = useState(initialData?.paymentMethod || '');
    const [items, setItems]                     = useState<InvoiceItem[]>(
        initialData?.items?.map((item: any) => {
            const qty   = Number(item.quantity);
            const price = Number(item.unitPrice);
            const disc  = Number(item.discountPercent ?? 0);
            const vat   = Number(item.vatPercent ?? 0);
            return {
                productId:       item.productId,
                description:     item.description,
                quantity:        qty,
                unitPrice:       price,
                discountPercent: disc,
                vatPercent:      vat,
                totalPrice:      qty * price * (1 - disc / 100) * (1 + vat / 100),
            };
        }) || [{ description: '', quantity: 1, unitPrice: 0, discountPercent: 0, vatPercent: 0, totalPrice: 0 }]
    );

    useEffect(() => {
        fetchClients();
        fetchProducts();
    }, []);

    // Populate product names in edit mode
    useEffect(() => {
        if (products.length > 0) {
            setItems(prev => prev.map(item => {
                if (item.productId && !item.productName) {
                    const p = products.find(p => p.id === item.productId);
                    if (p) return { ...item, productName: p.name };
                }
                return item;
            }));
        }
    }, [products]);

    const fetchClients = async () => {
        try { setClients((await api.get('/companies')).data); } catch {}
    };
    const fetchProducts = async () => {
        try { setProducts((await api.get('/inventory')).data); } catch {}
    };

    const parsePaymentTermsDays = (terms: string | null | undefined): number | null => {
        if (!terms) return null;
        const t = terms.trim().toUpperCase();
        if (t === 'COD' || t === 'IMMEDIATE' || t === 'PIA') return 0;
        const match = t.match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
    };

    const autoCalcDueDate = (invoiceDate: string, terms: string | null | undefined) => {
        const days = parsePaymentTermsDays(terms);
        if (days === null || !invoiceDate) return;
        const d = new Date(invoiceDate);
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().split('T')[0]);
    };

    const calcLineTotal = (qty: number, price: number, disc: number, vat: number) => {
        const net = qty * price * (1 - Math.max(0, Math.min(100, disc)) / 100);
        return net * (1 + Math.max(0, Math.min(100, vat)) / 100);
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            const item    = { ...updated[index], [field]: value };

            if (field === 'productName') {
                item.isSearchOpen = true;
                if (!value) item.productId = undefined;
            }
            if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent' || field === 'vatPercent') {
                const qty   = field === 'quantity'        ? Number(value) : item.quantity;
                const price = field === 'unitPrice'       ? Number(value) : item.unitPrice;
                const disc  = field === 'discountPercent' ? Number(value) : item.discountPercent;
                const vat   = field === 'vatPercent'      ? Number(value) : item.vatPercent;
                item.totalPrice = calcLineTotal(qty, price, disc, vat);
            }
            updated[index] = item;
            return updated;
        });
    };

    const handleProductSelect = (index: number, product: Product) => {
        setItems(prev => {
            const updated = [...prev];
            const item    = {
                ...updated[index],
                productId:   product.id,
                productName: product.name,
                description: product.name,
                unitPrice:   Number(product.price),
                isSearchOpen: false,
            };
            item.totalPrice = calcLineTotal(item.quantity, item.unitPrice, item.discountPercent, item.vatPercent);
            updated[index]  = item;
            if (index === updated.length - 1) {
                updated.push({ description: '', quantity: 1, unitPrice: 0, discountPercent: 0, vatPercent: parseFloat(taxRate) || 0, totalPrice: 0 });
            }
            return updated;
        });
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Per-line VAT already included in each item.totalPrice
    const subtotalInclVat = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
    const subtotalExVat   = items.reduce((s, i) => {
        const net = i.quantity * i.unitPrice * (1 - Math.max(0, Math.min(100, i.discountPercent)) / 100);
        return s + net;
    }, 0);
    const totalVatAmount  = subtotalInclVat - subtotalExVat;
    const headerDiscount  = subtotalInclVat * (parseFloat(discountPercent) / 100 || 0);
    const total           = subtotalInclVat - headerDiscount;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const payload = {
                companyId:       parseInt(companyId),
                status, date, taxRate: parseFloat(taxRate),
                discountPercent: parseFloat(discountPercent) || 0,
                discountAmount:  headerDiscount,
                dueDate:         dueDate || null,
                notes:           notes || null,
                poNumber:        poNumber || null,
                poDate:          poDate || null,
                paymentMethod:   paymentMethod || null,
                totalAmount:     total,
                items:           items.map(item => ({
                    productId:       item.productId ? Number(item.productId) : null,
                    description:     item.description,
                    quantity:        Number(item.quantity),
                    unitPrice:       Number(item.unitPrice),
                    discountPercent: Number(item.discountPercent || 0),
                    vatPercent:      Number(item.vatPercent || 0),
                    totalPrice:      Number(item.totalPrice),
                })),
            };

            if (isEditing && initialData?.id) {
                await api.put(`/invoices/${initialData.id}`, payload);
            } else {
                await api.post('/invoices', payload);
            }
            router.push('/dashboard/invoices');
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={isReadOnly} className="space-y-6">
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Invoice Details */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client *</label>
                        <select
                            required value={companyId}
                            onChange={e => {
                                const id     = e.target.value;
                                const client = clients.find(c => c.id.toString() === id);
                                setCompanyId(id);
                                const newVat = client?.vatPercentage != null ? client.vatPercentage.toString() : taxRate;
                                if (client?.vatPercentage != null) setTaxRate(newVat);
                                autoCalcDueDate(date, client?.paymentTerms);
                                // Pre-fill vatPercent on existing blank items
                                const vatVal = parseFloat(newVat) || 0;
                                setItems(prev => prev.map(item =>
                                    item.vatPercent === 0 ? { ...item, vatPercent: vatVal, totalPrice: calcLineTotal(item.quantity, item.unitPrice, item.discountPercent, vatVal) } : item
                                ));
                            }}
                            className={inputCls}
                        >
                            <option value="">Select Client</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls}>
                            <option value="DRAFT">Draft</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PAID">Paid</option>
                            <option value="OVERDUE">Overdue</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date *</label>
                        <input type="date" required value={date} onChange={e => {
                            setDate(e.target.value);
                            const client = clients.find(c => c.id.toString() === companyId);
                            autoCalcDueDate(e.target.value, client?.paymentTerms);
                        }} className={inputCls} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputCls}>
                            <option value="">Not specified</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CASH">Cash</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Number (Customer)</label>
                        <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="e.g. PO-2024-001" className={inputCls} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Date</label>
                        <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} className={inputCls} />
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Line Items</h3>

                {/* Header row */}
                <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
                    <div className="col-span-3">Item / Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-2 text-right">Unit Price</div>
                    <div className="col-span-1 text-right">Disc%</div>
                    <div className="col-span-1 text-right">VAT%</div>
                    <div className="col-span-2 text-right">Total (incl. VAT)</div>
                    <div className="col-span-1" />
                </div>

                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start">
                            {/* Product search + description */}
                            <div className="col-span-12 md:col-span-3 space-y-1 relative">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search product..."
                                        value={item.productName || ''}
                                        onChange={e => handleItemChange(index, 'productName', e.target.value)}
                                        onFocus={() => handleItemChange(index, 'isSearchOpen', true)}
                                        autoComplete="off"
                                        className={inputCls}
                                    />
                                    {item.isSearchOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => handleItemChange(index, 'isSearchOpen', false)} />
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                {products
                                                    .filter(p => !item.productName || p.name.toLowerCase().includes(item.productName.toLowerCase()))
                                                    .map(p => (
                                                        <button key={p.id} type="button"
                                                            onMouseDown={e => { e.preventDefault(); handleProductSelect(index, p); }}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                                        >
                                                            <div className="font-medium">{p.name}</div>
                                                            <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                                                                <span>SKU: {p.sku}</span>
                                                                <span className="text-blue-600">₹{p.price}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                {products.filter(p => !item.productName || p.name.toLowerCase().includes(item.productName.toLowerCase())).length === 0 && (
                                                    <div className="px-3 py-2 text-sm text-gray-400 italic text-center">No products found</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <input type="text" placeholder="Description" value={item.description}
                                    onChange={e => handleItemChange(index, 'description', e.target.value)}
                                    className={inputCls} />
                            </div>

                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="1" value={item.quantity}
                                    onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                    className={`${inputCls} text-center`} />
                            </div>

                            <div className="col-span-4 md:col-span-2">
                                <input type="number" min="0" step="0.01" value={item.unitPrice}
                                    onChange={e => handleItemChange(index, 'unitPrice', e.target.value)}
                                    className={`${inputCls} text-right`} />
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <input type="number" min="0" max="100" step="0.1" value={item.discountPercent}
                                    onChange={e => handleItemChange(index, 'discountPercent', e.target.value)}
                                    className={`${inputCls} text-right`} />
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <input type="number" min="0" max="100" step="0.1" value={item.vatPercent ?? 0}
                                    onChange={e => handleItemChange(index, 'vatPercent', e.target.value)}
                                    className={`${inputCls} text-right`} />
                            </div>

                            <div className="col-span-6 md:col-span-2 text-right py-2 text-sm font-medium text-gray-900 dark:text-white">
                                ₹{(item.totalPrice || 0).toFixed(2)}
                            </div>

                            <div className="col-span-2 md:col-span-1 text-center py-2">
                                {!isReadOnly && (
                                    <button type="button" onClick={() => removeItem(index)}
                                        className="text-red-500 hover:text-red-700 transition-colors pointer-events-auto"
                                        disabled={items.length === 1}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <div className="w-80 space-y-2 text-sm">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Subtotal (ex. VAT)</span>
                            <span>₹{subtotalExVat.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Total VAT (per line)</span>
                            <span>₹{totalVatAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>Subtotal (incl. VAT)</span>
                            <span>₹{subtotalInclVat.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                            <span>Header Discount %</span>
                            <input type="number" min="0" max="100" step="0.1" value={discountPercent}
                                onChange={e => setDiscountPercent(e.target.value)}
                                className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>

                        {headerDiscount > 0 && (
                            <div className="flex justify-between text-red-500 dark:text-red-400">
                                <span>Discount Amount</span>
                                <span>- ₹{headerDiscount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-gray-500 dark:text-gray-500 text-xs pt-1">
                            <span>Default VAT % (for new lines)</span>
                            <input type="number" min="0" step="0.1" value={taxRate}
                                onChange={e => setTaxRate(e.target.value)}
                                className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>

                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-600">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Terms / Notes</label>
                <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Payment due within 30 days via bank transfer..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
            </div>
            </fieldset>

            {/* Actions */}
            <div className={`flex items-center justify-end gap-4 ${isReadOnly ? 'pointer-events-auto' : ''}`}>
                <button type="button" onClick={() => router.back()}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {isReadOnly ? 'Back' : 'Cancel'}
                </button>
                {!isReadOnly && (
                    <button type="submit" disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <Save className="w-4 h-4" />}
                        {isEditing ? 'Update Invoice' : 'Create Invoice'}
                    </button>
                )}
            </div>
        </form>
    );
}
