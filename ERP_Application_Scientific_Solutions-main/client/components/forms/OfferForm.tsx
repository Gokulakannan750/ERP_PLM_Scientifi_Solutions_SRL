'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface Company {
    id: number;
    name: string;
    vatPercentage?: number | null;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    price: string;
    description: string;
}

interface OfferItem {
    productId?: number;
    productName?: string;
    isSearchOpen?: boolean;
    description: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    totalPrice: number;
}

interface OfferFormData {
    companyId: string;
    status: string;
    validUntil: string;
    taxRate: string;
    description: string;
    items: OfferItem[];
}

interface OfferFormProps {
    initialData?: any;
    isEditing?: boolean;
    isReadOnly?: boolean;
}

export default function OfferForm({ initialData, isEditing = false, isReadOnly = false }: OfferFormProps) {
    const router = useRouter();
    const [clients, setClients] = useState<Company[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState<OfferFormData>({
        companyId: initialData?.companyId?.toString() || '',
        status: initialData?.status || 'DRAFT',
        validUntil: initialData?.validUntil ? new Date(initialData.validUntil).toISOString().split('T')[0] : '',
        taxRate: initialData?.taxRate?.toString() || '0',
        description: initialData?.description || '',
        items: initialData?.items?.map((item: any) => {
            const qty  = Number(item.quantity);
            const price = Number(item.unitPrice);
            const disc  = Number(item.discountPercent ?? 0);
            return {
                productId: item.productId,
                description: item.description,
                quantity: qty,
                unitPrice: price,
                discountPercent: disc,
                totalPrice: qty * price * (1 - disc / 100),
            };
        }) || [{ description: '', quantity: 1, unitPrice: 0, discountPercent: 0, totalPrice: 0 }],
    });

    useEffect(() => {
        fetchClients();
        fetchProducts();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await api.get('/companies');
            setClients(response.data);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await api.get('/inventory');
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    // Populate product names when products are loaded (for Edit mode)
    useEffect(() => {
        if (products.length > 0 && formData.items.length > 0) {
            const updatedItems = formData.items.map(item => {
                if (item.productId && !item.productName) {
                    const product = products.find(p => p.id === item.productId);
                    if (product) {
                        return { ...item, productName: product.name };
                    }
                }
                return item;
            });

            // Only update if there are changes to avoid infinite loop
            const hasChanges = updatedItems.some((item, index) => item.productName !== formData.items[index].productName);
            if (hasChanges) {
                setFormData(prev => ({ ...prev, items: updatedItems }));
            }
        }
    }, [products]);

    const handleProductSelect = (index: number, product: Product) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            const item = { ...newItems[index] };

            // Update all fields at once
            item.productId = product.id;
            item.productName = product.name;
            item.description = product.description || product.name;
            item.unitPrice = Number(product.price);
            item.discountPercent = item.discountPercent ?? 0;
            item.totalPrice = item.quantity * Number(product.price) * (1 - (item.discountPercent) / 100);
            item.isSearchOpen = false;

            newItems[index] = item;

            // Auto-append if last item
            if (index === newItems.length - 1) {
                newItems.push({ description: '', quantity: 1, unitPrice: 0, discountPercent: 0, totalPrice: 0 });
            }

            return { ...prev, items: newItems };
        });
    };

    const handleItemChange = (index: number, field: keyof OfferItem, value: any) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            const item = { ...newItems[index], [field]: value };

            // Handle Product Search Input
            if (field === 'productName') {
                item.isSearchOpen = true;
                // Clear productId if name is manually changed (optional, depends on if you want to allow free-text products)
                if (!value) item.productId = undefined;
            }

            // Auto-calculate totals
            if (field === 'quantity' || field === 'unitPrice' || field === 'discountPercent') {
                const quantity = field === 'quantity' ? Number(value) : item.quantity;
                const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
                const disc = field === 'discountPercent' ? Math.min(100, Math.max(0, Number(value) || 0)) : (item.discountPercent ?? 0);
                item.totalPrice = quantity * unitPrice * (1 - disc / 100);
            }

            // Auto-fill description/price if product selected
            if (field === 'productId') {
                const product = products.find(p => p.id === Number(value));
                if (product) {
                    item.description = product.description || product.name;
                    item.unitPrice = Number(product.price);
                    item.discountPercent = item.discountPercent ?? 0;
                    item.totalPrice = item.quantity * Number(product.price) * (1 - (item.discountPercent) / 100);
                    item.productName = product.name;
                }

                // Auto-append new item if the last item has a product selected
                if (index === newItems.length - 1) {
                    newItems.push({ description: '', quantity: 1, unitPrice: 0, discountPercent: 0, totalPrice: 0 });
                }
            }

            newItems[index] = item;
            return { ...prev, items: newItems };
        });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0, discountPercent: 0, totalPrice: 0 }]
        });
    };

    const removeItem = (index: number) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const calculateSubtotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    };

    const calculateTotal = () => {
        const subtotal = calculateSubtotal();
        const tax = subtotal * (parseFloat(formData.taxRate) / 100);
        return subtotal + tax;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                companyId: parseInt(formData.companyId),
                status: formData.status,
                validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
                taxRate: parseFloat(formData.taxRate),
                description: formData.description,
                items: formData.items.map(item => ({
                    productId: item.productId ? Number(item.productId) : null,
                    description: item.description,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice),
                    discountPercent: Number(item.discountPercent ?? 0),
                    totalPrice: Number(item.totalPrice)
                })),
                totalAmount: calculateTotal()
            };

            if (isEditing && initialData?.id) {
                await api.put(`/offers/${initialData.id}`, payload);
            } else {
                await api.post('/offers', payload);
            }

            router.push('/dashboard/offers');
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-6 ${isReadOnly ? 'pointer-events-none opacity-90' : ''}`}>
            <fieldset disabled={isReadOnly} className="space-y-6">
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Quote Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Client */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Client *
                        </label>
                        <select
                            required
                            value={formData.companyId}
                            onChange={(e) => {
                                const companyId = e.target.value;
                                const client = clients.find(c => c.id.toString() === companyId);
                                setFormData({ 
                                    ...formData, 
                                    companyId,
                                    taxRate: (client?.vatPercentage !== undefined && client?.vatPercentage !== null)
                                        ? client.vatPercentage.toString() 
                                        : formData.taxRate
                                });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">Select Client</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Valid Until */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Valid Until
                        </label>
                        <input
                            type="date"
                            value={formData.validUntil}
                            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description / Notes
                        </label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Line Items
                    </h3>
                    {/* <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Item
                    </button> */}
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-2">
                        <div className="col-span-3">Item details</div>
                        <div className="col-span-2 text-center">Quantity</div>
                        <div className="col-span-2 text-right">Price</div>
                        <div className="col-span-2 text-right">Disc %</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1"></div>
                    </div>

                    {formData.items.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 items-start">
                            <div className="col-span-3 space-y-2 relative">
                                {/* Product Search Input */}
                                {/* Product Search Input */}
                                <div className="relative search-container">
                                    <input
                                        type="text"
                                        placeholder="Search Product..."
                                        value={item.productName || ''}
                                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                                        onFocus={() => handleItemChange(index, 'isSearchOpen', true)}
                                        autoComplete="off"
                                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                    {/* Dropdown Suggestions */}
                                    {item.isSearchOpen && (
                                        <>
                                            {/* Backdrop to close on click outside */}
                                            <div
                                                className="fixed inset-0 z-40 cursor-default"
                                                onClick={() => handleItemChange(index, 'isSearchOpen', false)}
                                            ></div>

                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {products
                                                    .filter(p => !item.productName || p.name.toLowerCase().includes(item.productName.toLowerCase()))
                                                    .map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                // Prevent blur from firing before click
                                                                e.preventDefault();
                                                                handleProductSelect(index, p);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 last:border-0"
                                                        >
                                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                                                            <div className="flex justify-between mt-1">
                                                                <span className="text-xs text-gray-500">SKU: {p.sku}</span>
                                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">₹{p.price}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                {products.filter(p => !item.productName || p.name.toLowerCase().includes(item.productName.toLowerCase())).length === 0 && (
                                                    <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic text-center">No products found</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Description"
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="col-span-2">
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.discountPercent ?? 0}
                                    onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)}
                                    className="w-full px-3 py-2 text-sm text-right border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="col-span-2 text-right py-2 text-sm font-medium text-gray-900 dark:text-white">
                                ₹{(item.totalPrice ?? 0).toFixed(2)}
                            </div>

                            <div className="col-span-1 text-center py-2">
                                {!isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="text-red-500 hover:text-red-700 transition-colors pointer-events-auto"
                                        disabled={formData.items.length === 1}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <div className="w-72 space-y-3">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>Subtotal</span>
                            <span>₹{calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                            <span>Tax Rate (%)</span>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={formData.taxRate}
                                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                                className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>Tax Amount</span>
                            <span>₹{(calculateSubtotal() * (parseFloat(formData.taxRate) / 100)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-600">
                            <span>Total</span>
                            <span>₹{calculateTotal().toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            </fieldset>

            {/* Form Actions */}
            <div className={`flex items-center justify-end gap-4 ${isReadOnly ? 'pointer-events-auto opacity-100' : ''}`}>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    {isReadOnly ? 'Back' : 'Cancel'}
                </button>
                {!isReadOnly && (
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isEditing ? 'Update Quote' : 'Create Quote'}
                    </button>
                )}
            </div>
        </form>
    );
}
