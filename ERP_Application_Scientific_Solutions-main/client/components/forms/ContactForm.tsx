'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, AlertCircle, User, Link as LinkIcon, FileText, FileSpreadsheet } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Company {
    id: number;
    name: string;
}

interface Address {
    id: number;
    type: string | null;
    street: string | null;
    city: string | null;
}

interface ContactFormData {
    firstName: string;
    surname: string;
    email: string;
    pecEmail: string;
    phone: string;
    cellPhone: string;
    jobTitle: string;
    notes: string;
    quickNotes: string;
    companyId: string;
    addressId: string;
}

interface ContactFormProps {
    initialData?: any;
    isEditing?: boolean;
}

export default function ContactForm({ initialData, isEditing = false }: ContactFormProps) {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyAddresses, setCompanyAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('details');

    const [formData, setFormData] = useState<ContactFormData>({
        firstName: initialData?.firstName || '',
        surname: initialData?.surname || '',
        email: initialData?.email || '',
        pecEmail: initialData?.pecEmail || '',
        phone: initialData?.phone || '',
        cellPhone: initialData?.cellPhone || '',
        jobTitle: initialData?.jobTitle || '',
        notes: initialData?.notes || '',
        quickNotes: initialData?.quickNotes || '',
        companyId: initialData?.companyId?.toString() || '',
        addressId: initialData?.addressId?.toString() || '',
    });

    useEffect(() => {
        fetchCompanies();
        if (initialData?.companyId) {
            fetchAddressesForCompany(initialData.companyId);
        }
    }, [initialData?.companyId]);

    const fetchCompanies = async () => {
        try {
            const response = await api.get('/companies');
            setCompanies(response.data);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    };

    const fetchAddressesForCompany = async (companyId: number | string) => {
        try {
            const response = await api.get(`/companies/${companyId}`);
            setCompanyAddresses(response.data.addresses || []);
        } catch (error) {
            console.error('Failed to fetch addresses:', error);
            setCompanyAddresses([]);
        }
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const companyId = e.target.value;
        setFormData({ ...formData, companyId, addressId: '' });
        if (companyId) {
            fetchAddressesForCompany(companyId);
        } else {
            setCompanyAddresses([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const payload = {
                firstName: formData.firstName,
                surname: formData.surname,
                email: formData.email,
                pecEmail: formData.pecEmail,
                phone: formData.phone,
                cellPhone: formData.cellPhone,
                jobTitle: formData.jobTitle,
                notes: formData.notes,
                quickNotes: formData.quickNotes,
                companyId: parseInt(formData.companyId),
                addressId: formData.addressId ? parseInt(formData.addressId) : null,
            };

            if (isEditing && initialData?.id) {
                await api.put(`/contacts/${initialData.id}`, payload);
            } else {
                await api.post('/contacts', payload);
            }

            router.push('/dashboard/contacts');
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'details', label: 'Contact Details', icon: User },
        ...(isEditing ? [{ id: 'linked', label: 'Linked Records', icon: LinkIcon }] : [])
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
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <form id="contact-form" onSubmit={handleSubmit}>
                    
                    {/* Details Tab */}
                    <div className={activeTab === 'details' ? 'block space-y-6' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Names */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                                <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Surname *</label>
                                <input type="text" required value={formData.surname} onChange={(e) => setFormData({ ...formData, surname: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>

                            {/* Job & Company */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                                <input type="text" value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company *</label>
                                <select required value={formData.companyId} onChange={handleCompanyChange} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="">Select Company</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Contact Methods */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Email</label>
                                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PEC Email (Certified)</label>
                                <input type="email" value={formData.pecEmail} onChange={(e) => setFormData({ ...formData, pecEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direct Phone</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cell Phone</label>
                                <input type="tel" value={formData.cellPhone} onChange={(e) => setFormData({ ...formData, cellPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>

                            {/* Address Linking */}
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Location (Company Address)</label>
                                <select value={formData.addressId} onChange={(e) => setFormData({ ...formData, addressId: e.target.value })} disabled={!formData.companyId || companyAddresses.length === 0} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50">
                                    <option value="">Select Address</option>
                                    {companyAddresses.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.type ? `[${a.type}] ` : ''}{a.street}, {a.city}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quick Notes</label>
                                <input type="text" placeholder="E.g., Prefers calls after 2pm" value={formData.quickNotes} onChange={(e) => setFormData({ ...formData, quickNotes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">General Notes</label>
                                <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                    </div>

                </form>

                {/* Linked Records Tab */}
                {activeTab === 'linked' && isEditing && initialData?.company && (
                    <div className="space-y-8">
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                <FileText className="w-4 h-4 text-blue-500" />
                                Recent Invoices for {initialData.company.name}
                            </h4>
                            {initialData.company.invoices?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {initialData.company.invoices.map((inv: any) => (
                                        <Link key={inv.id} href={`/dashboard/invoices/${inv.id}`} className="block p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-300 transition-colors">
                                            <div className="font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</div>
                                            <div className="text-sm text-gray-500 mt-1">Status: {inv.status}</div>
                                            <div className="text-sm text-gray-500">Amount: ₹{inv.totalAmount}</div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No recent invoices found.</p>
                            )}
                        </div>
                        
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                <FileSpreadsheet className="w-4 h-4 text-purple-500" />
                                Recent Offers for {initialData.company.name}
                            </h4>
                            {initialData.company.offers?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {initialData.company.offers.map((offer: any) => (
                                        <Link key={offer.id} href={`/dashboard/offers/${offer.id}`} className="block p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-purple-300 transition-colors">
                                            <div className="font-medium text-gray-900 dark:text-white">{offer.offerNumber}</div>
                                            <div className="text-sm text-gray-500 mt-1">Status: {offer.status}</div>
                                            <div className="text-sm text-gray-500">Valid Until: {offer.validUntil ? new Date(offer.validUntil).toLocaleDateString() : 'N/A'}</div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">No recent offers found.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Form Actions */}
            {activeTab === 'details' && (
                <div className="flex items-center justify-end gap-4">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="contact-form" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                        {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEditing ? 'Save Changes' : 'Create Contact'}
                    </button>
                </div>
            )}
        </div>
    );
}
