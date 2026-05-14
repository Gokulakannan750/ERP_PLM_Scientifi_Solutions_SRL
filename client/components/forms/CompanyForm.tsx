'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, AlertCircle, Building2, MapPin, CreditCard, FileText, History } from 'lucide-react';
import api from '@/lib/api';

import BankAccountForm from './BankAccountForm';
import DocumentUpload from './DocumentUpload';
import ChangeLogModal from '../modals/ChangeLogModal';

interface Category {
    id: number;
    name: string;
}

interface CompanyFormData {
    name: string;
    email: string;
    phone: string;
    website: string;
    categoryId: string;
    taxId: string;
    gstNumber: string;
    vatPercentage: string;
    paymentTerms: string;
    incoterms: string;
    notes: string;
    
    addressType: string;
    street: string;
    street2: string;
    houseNumber: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
}

interface CompanyFormProps {
    initialData?: any;
    isdEditing?: boolean;
}

export default function CompanyForm({ initialData, isdEditing = false }: CompanyFormProps) {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    
    // Sub-data for editing
    const [bankAccounts, setBankAccounts] = useState(initialData?.bankAccounts || []);
    const [documents, setDocuments] = useState(initialData?.documents || []);
    const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);

    const address = initialData?.addresses?.[0] || {};

    const [formData, setFormData] = useState<CompanyFormData>({
        name: initialData?.name || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        website: initialData?.website || '',
        categoryId: initialData?.categoryId?.toString() || '',
        taxId: initialData?.taxId || '',
        gstNumber: initialData?.gstNumber || '',
        vatPercentage: initialData?.vatPercentage?.toString() || '',
        paymentTerms: initialData?.paymentTerms || '',
        incoterms: initialData?.incoterms || '',
        notes: initialData?.notes || '',

        addressType: address.type || 'billing',
        street: address.street || '',
        street2: address.street2 || '',
        houseNumber: address.houseNumber || '',
        city: address.city || '',
        state: address.state || '',
        pincode: address.pincode || '',
        country: address.country || 'India',
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/categories');
            setCategories(response.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                website: formData.website,
                categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
                taxId: formData.taxId,
                gstNumber: formData.gstNumber,
                vatPercentage: formData.vatPercentage ? parseFloat(formData.vatPercentage) : null,
                paymentTerms: formData.paymentTerms,
                incoterms: formData.incoterms,
                notes: formData.notes,
                address: {
                    type: formData.addressType,
                    street: formData.street,
                    street2: formData.street2,
                    houseNumber: formData.houseNumber,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode,
                    country: formData.country,
                }
            };

            if (isdEditing && initialData?.id) {
                await api.put(`/companies/${initialData.id}`, payload);
            } else {
                await api.post('/companies', payload);
            }

            router.push('/dashboard/companies');
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'general', label: 'General Info', icon: Building2 },
        { id: 'address', label: 'Address', icon: MapPin },
        ...(isdEditing ? [
            { id: 'bank', label: 'Bank Accounts', icon: CreditCard },
            { id: 'docs', label: 'Documents', icon: FileText }
        ] : [])
    ];

    return (
        <div className="space-y-6">
            {/* Header / Tabs Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex overflow-x-auto hide-scrollbar gap-1 w-full sm:w-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                    isActive 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                
                {isdEditing && (
                    <button
                        type="button"
                        onClick={() => setIsChangeLogOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 shrink-0"
                    >
                        <History className="w-4 h-4" />
                        History Log
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                {/* Form Content Wrapper */}
                <form id="company-form" onSubmit={handleSubmit}>
                    
                    {/* General Tab */}
                    <div className={activeTab === 'general' ? 'block space-y-6' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name *</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                                <select required value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="">Select Category</option>
                                    {categories.map((category) => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                                <input type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>

                        <hr className="border-gray-200 dark:border-gray-700" />
                        <h4 className="font-medium text-gray-900 dark:text-white">Tax & Commercial Details</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID / PAN</label>
                                <input type="text" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Number</label>
                                <input type="text" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default VAT %</label>
                                <input type="number" step="0.01" value={formData.vatPercentage} onChange={(e) => setFormData({ ...formData, vatPercentage: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Terms</label>
                                <select value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="">None specified</option>
                                    <option value="Anticipated">Anticipated (Advance)</option>
                                    <option value="Net 15">Net 15</option>
                                    <option value="Net 30">Net 30</option>
                                    <option value="Net 60">Net 60</option>
                                    <option value="Net 90">Net 90</option>
                                    <option value="On Delivery">On Delivery</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Incoterms</label>
                                <select value={formData.incoterms} onChange={(e) => setFormData({ ...formData, incoterms: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="">None specified</option>
                                    <option value="EXW">EXW (Ex Works)</option>
                                    <option value="FCA">FCA (Free Carrier)</option>
                                    <option value="FOB">FOB (Free on Board)</option>
                                    <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                                    <option value="DAP">DAP (Delivered at Place)</option>
                                    <option value="DDP">DDP (Delivered Duty Paid)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                            <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>
                    </div>

                    {/* Address Tab */}
                    <div className={activeTab === 'address' ? 'block space-y-6' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Type</label>
                                <select value={formData.addressType} onChange={(e) => setFormData({ ...formData, addressType: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="billing">Billing</option>
                                    <option value="shipping">Shipping</option>
                                    <option value="both">Both</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                                <input type="text" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address 2 (Optional)</label>
                                <input type="text" value={formData.street2} onChange={(e) => setFormData({ ...formData, street2: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">House/Building Number</label>
                                <input type="text" value={formData.houseNumber} onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State / Province</label>
                                <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP / Postal Code</label>
                                <input type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                                <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Bank Accounts Tab (Outside main form logic, saves instantly) */}
                {activeTab === 'bank' && isdEditing && (
                    <BankAccountForm 
                        companyId={initialData.id} 
                        accounts={bankAccounts} 
                        onAccountAdded={(acc) => setBankAccounts([...bankAccounts, acc])}
                        onAccountDeleted={(id) => setBankAccounts(bankAccounts.filter((a: any) => a.id !== id))}
                        onAccountUpdated={(acc) => setBankAccounts(bankAccounts.map((a: any) => a.id === acc.id ? acc : { ...a, isDefault: acc.isDefault ? false : a.isDefault }))}
                    />
                )}

                {/* Documents Tab */}
                {activeTab === 'docs' && isdEditing && (
                    <DocumentUpload 
                        companyId={initialData.id}
                        documents={documents}
                        onDocumentAdded={(doc) => setDocuments([doc, ...documents])}
                        onDocumentDeleted={(id) => setDocuments(documents.filter((d: any) => d.id !== id))}
                    />
                )}
            </div>

            {/* Form Actions (Only for main form) */}
            {(activeTab === 'general' || activeTab === 'address') && (
                <div className="flex items-center justify-end gap-4">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="company-form" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {isdEditing ? 'Save Changes' : 'Create Company'}
                    </button>
                </div>
            )}

            {isChangeLogOpen && initialData?.id && (
                <ChangeLogModal 
                    isOpen={isChangeLogOpen}
                    onClose={() => setIsChangeLogOpen(false)}
                    logs={initialData.changeLogs || []}
                    entityName={initialData.name}
                />
            )}
        </div>
    );
}
