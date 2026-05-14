'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, AlertCircle, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

interface Company {
    id: number;
    name: string;
}

interface ProductCategory {
    id: number;
    code: string;
    name: string;
    subcategories: ProductSubcategory[];
}

interface ProductSubcategory {
    id: number;
    code: string;
    name: string;
}

interface ProductFormData {
    sku: string;
    name: string;
    description: string;
    price: string;
    quantity: string;
    minLevel: string;
    maxLevel: string;
    supplierId: string;
    categoryCode: string;
    subcategoryCode: string;
    brand: string;
    itemType: string;
    unitOfMeasure: string;
    currency: string;
    importDutyPercentage: string;
    shippingCostPerItem: string;
    alternativeSupplierId: string;
    primarySupplierArticleNumber: string;
    alternativeSupplierArticleNumber: string;
    reorderQuantity: string;
    reorderTriggerThreshold: string;
    leadTimeDays: string;
    supplierQuoteReference: string;
    hsCode: string;
    storageFacility: string;
    storageWarehouse: string;
    storageShelf: string;
    storageBin: string;
    barcodeQrData: string;
    plmItemLink: string;
    plmType: string;
}

interface ProductFormProps {
    initialData?: any;
    isEditing?: boolean;
}

export default function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
    const router = useRouter();
    const [suppliers, setSuppliers] = useState<Company[]>([]);
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatingSku, setGeneratingSku] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [formData, setFormData] = useState<ProductFormData>({
        sku: initialData?.sku || '',
        name: initialData?.name || '',
        description: initialData?.description || '',
        price: initialData?.price?.toString() || '',
        quantity: initialData?.quantity?.toString() || '0',
        minLevel: initialData?.minLevel?.toString() || '5',
        maxLevel: initialData?.maxLevel?.toString() || '100',
        supplierId: initialData?.supplierId?.toString() || '',
        categoryCode: initialData?.categoryCode || '',
        subcategoryCode: initialData?.subcategoryCode || '',
        brand: initialData?.brand || '',
        itemType: initialData?.itemType || '',
        unitOfMeasure: initialData?.unitOfMeasure || '',
        currency: initialData?.currency || 'USD',
        importDutyPercentage: initialData?.importDutyPercentage?.toString() || '',
        shippingCostPerItem: initialData?.shippingCostPerItem?.toString() || '',
        alternativeSupplierId: initialData?.alternativeSupplierId?.toString() || '',
        primarySupplierArticleNumber: initialData?.primarySupplierArticleNumber || '',
        alternativeSupplierArticleNumber: initialData?.alternativeSupplierArticleNumber || '',
        reorderQuantity: initialData?.reorderQuantity?.toString() || '',
        reorderTriggerThreshold: initialData?.reorderTriggerThreshold?.toString() || '5',
        leadTimeDays: initialData?.leadTimeDays?.toString() || '',
        supplierQuoteReference: initialData?.supplierQuoteReference || '',
        hsCode: initialData?.hsCode || '',
        storageFacility: initialData?.storageFacility || '',
        storageWarehouse: initialData?.storageWarehouse || '',
        storageShelf: initialData?.storageShelf || '',
        storageBin: initialData?.storageBin || '',
        barcodeQrData: initialData?.barcodeQrData || '',
        plmItemLink: initialData?.plmItemLink || '',
        plmType: initialData?.plmType || '',
    });

    useEffect(() => {
        fetchSuppliers();
        fetchCategories();
    }, []);

    // When category or subcategory changes, auto-generate SKU if not editing
    useEffect(() => {
        if (!isEditing && formData.categoryCode && formData.subcategoryCode) {
            generateSkuPreview();
        }
    }, [formData.categoryCode, formData.subcategoryCode]);

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/companies');
            setSuppliers(response.data);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/product-categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const generateSkuPreview = async () => {
        if (!formData.categoryCode || !formData.subcategoryCode) return;
        setGeneratingSku(true);
        try {
            const response = await api.get(`/inventory/sku/preview?categoryCode=${formData.categoryCode}&subcategoryCode=${formData.subcategoryCode}`);
            if (response.data.sku) {
                setFormData(prev => ({ ...prev, sku: response.data.sku }));
            }
        } catch (error) {
            console.error('Failed to generate SKU preview:', error);
        } finally {
            setGeneratingSku(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                quantity: parseInt(formData.quantity) || 0,
                minLevel: parseInt(formData.minLevel) || 5,
                maxLevel: parseInt(formData.maxLevel) || 100,
                supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
                alternativeSupplierId: formData.alternativeSupplierId ? parseInt(formData.alternativeSupplierId) : null,
                importDutyPercentage: formData.importDutyPercentage ? parseFloat(formData.importDutyPercentage) : null,
                shippingCostPerItem: formData.shippingCostPerItem ? parseFloat(formData.shippingCostPerItem) : null,
                reorderQuantity: formData.reorderQuantity ? parseInt(formData.reorderQuantity) : null,
                reorderTriggerThreshold: formData.reorderTriggerThreshold ? parseInt(formData.reorderTriggerThreshold) : 5,
                leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : null,
            };

            if (isEditing && initialData?.id) {
                await api.put(`/inventory/${initialData.id}`, payload);
            } else if (formData.plmType) {
                await api.post('/api/plm/items', payload);
            } else {
                await api.post('/inventory', payload);
            }

            router.push('/dashboard/inventory');
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const activeCategory = categories.find(c => c.code === formData.categoryCode);
    const subcategories = activeCategory?.subcategories || [];

    const tabs = [
        { id: 'general', label: 'General Info' },
        { id: 'engineering', label: 'Engineering (PLM)' },
        { id: 'supplier', label: 'Supplier & Reorder' },
        { id: 'logistics', label: 'Logistics & Storage' },
    ];

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* TAB 1: General Info */}
                {activeTab === 'general' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Classification</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                    <select
                                        name="categoryCode"
                                        value={formData.categoryCode}
                                        onChange={(e) => setFormData({ ...formData, categoryCode: e.target.value, subcategoryCode: '' })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.code}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subcategory</label>
                                    <select
                                        name="subcategoryCode"
                                        value={formData.subcategoryCode}
                                        onChange={handleChange}
                                        disabled={!formData.categoryCode}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                    >
                                        <option value="">Select Subcategory</option>
                                        {subcategories.map((s) => (
                                            <option key={s.id} value={s.code}>{s.code} - {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU (Stock Keeping Unit) *</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            name="sku"
                                            value={formData.sku}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        {generatingSku && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                                    <input type="text" required name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                                    <input type="text" name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Type</label>
                                    <select name="itemType" value={formData.itemType} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="">Select Type</option>
                                        <option value="raw material">Raw Material</option>
                                        <option value="finished part">Finished Part</option>
                                        <option value="assembly">Assembly</option>
                                        <option value="commercial">Commercial</option>
                                        <option value="consumable">Consumable</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit of Measure</label>
                                    <select name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="">Select UoM</option>
                                        <option value="pcs">Pieces (pcs)</option>
                                        <option value="kg">Kilograms (kg)</option>
                                        <option value="m">Meters (m)</option>
                                        <option value="ltr">Liters (ltr)</option>
                                        <option value="set">Set</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing & Duties</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price *</label>
                                    <div className="flex">
                                        <select name="currency" value={formData.currency} onChange={handleChange} className="px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white">
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="INR">INR</option>
                                        </select>
                                        <input type="number" step="0.01" required name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">HS Code</label>
                                    <input type="text" name="hsCode" value={formData.hsCode} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Import Duty (%)</label>
                                    <input type="number" step="0.1" name="importDutyPercentage" value={formData.importDutyPercentage} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping Cost per Item</label>
                                    <input type="number" step="0.01" name="shippingCostPerItem" value={formData.shippingCostPerItem} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* TAB 1.5: Engineering (PLM) */}
                {activeTab === 'engineering' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">PLM Classification</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PLM Type</label>
                                    <select
                                        name="plmType"
                                        value={formData.plmType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Standard Inventory Item</option>
                                        <option value="P">P - Designed Part</option>
                                        <option value="A">A - Assembly</option>
                                        <option value="C">C - Commercial Item</option>
                                        <option value="D">D - Drawing</option>
                                    </select>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Selecting a PLM type will auto-generate a part number (e.g. P00042A) and enable lifecycle tracking.
                                    </p>
                                </div>
                                {formData.plmType === 'D' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent Item ID</label>
                                        <input 
                                            type="number" 
                                            name="parentId" 
                                            placeholder="ID of parent Part/Assembly"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: Supplier & Reorder */}
                {activeTab === 'supplier' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supplier Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Supplier</label>
                                    <select name="supplierId" value={formData.supplierId} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Supplier Article #</label>
                                    <input type="text" name="primarySupplierArticleNumber" value={formData.primarySupplierArticleNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alternative Supplier</label>
                                    <select name="alternativeSupplierId" value={formData.alternativeSupplierId} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                        <option value="">Select Alternative</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alt. Supplier Article #</label>
                                    <input type="text" name="alternativeSupplierArticleNumber" value={formData.alternativeSupplierArticleNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reorder Parameters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Trigger Threshold</label>
                                    <input type="number" name="reorderTriggerThreshold" value={formData.reorderTriggerThreshold} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Reorder Quantity</label>
                                    <input type="number" name="reorderQuantity" value={formData.reorderQuantity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Time (Days)</label>
                                    <input type="number" name="leadTimeDays" value={formData.leadTimeDays} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Quote Reference</label>
                                    <input type="text" name="supplierQuoteReference" value={formData.supplierQuoteReference} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Logistics & Storage */}
                {activeTab === 'logistics' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock Levels</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Stock</label>
                                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min Alert Level</label>
                                    <input type="number" name="minLevel" value={formData.minLevel} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Storage Level</label>
                                    <input type="number" name="maxLevel" value={formData.maxLevel} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facility / Branch</label>
                                    <input type="text" name="storageFacility" value={formData.storageFacility} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Warehouse</label>
                                    <input type="text" name="storageWarehouse" value={formData.storageWarehouse} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shelf</label>
                                    <input type="text" name="storageShelf" value={formData.storageShelf} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bin Reference</label>
                                    <input type="text" name="storageBin" value={formData.storageBin} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode / QR Data</label>
                                    <input type="text" name="barcodeQrData" value={formData.barcodeQrData} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PLM Item Link</label>
                                    <input type="text" name="plmItemLink" value={formData.plmItemLink} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Auto-set when item originates from PLM" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-4 mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
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
                        {isEditing ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
}
