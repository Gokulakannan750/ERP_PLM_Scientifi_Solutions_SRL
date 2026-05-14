'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, MoreVertical, Building2, MapPin, Phone, Mail, Archive } from 'lucide-react';
import api from '@/lib/api';

interface Company {
    id: number;
    name: string;
    email: string;
    phone: string;
    website: string;
    vatPercentage: number | null;
    isObsolete: boolean;
    category?: {
        name: string;
    };
    _count?: {
        projects: number;
        invoices: number;
    };
}

export default function CompaniesPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showObsolete, setShowObsolete] = useState(false);

    useEffect(() => {
        fetchCompanies();
    }, [showObsolete]);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/companies?showObsolete=${showObsolete}`);
            setCompanies(response.data);
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleObsoleteToggle = async (id: number) => {
        if (!confirm('Mark this company as obsolete? It will be hidden by default.')) return;
        try {
            await api.delete(`/companies/${id}`);
            fetchCompanies();
        } catch (err) {
            alert('Failed to mark as obsolete');
        }
    }

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Manage your clients, suppliers, and partners
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowObsolete(!showObsolete)}
                        className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors text-sm font-medium ${
                            showObsolete 
                            ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' 
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Archive className="w-4 h-4" />
                        {showObsolete ? 'Hide Obsolete' : 'Show Obsolete'}
                    </button>
                    <Link
                        href="/dashboard/companies/new"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Company
                    </Link>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-background dark:bg-gray-950 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCompanies.map((company) => (
                        <div
                            key={company.id}
                            className={`bg-card-bg dark:bg-gray-900 rounded-xl shadow-sm border p-6 group relative transition-all ${
                                company.isObsolete 
                                ? 'border-status-warning opacity-75' 
                                : 'border-gray-100 dark:border-gray-800 hover:shadow-md'
                            }`}
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 w-[85%]">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                                        company.isObsolete 
                                        ? 'bg-status-warning/10 text-status-warning' 
                                        : 'bg-status-info/10 text-status-info'
                                    }`}>
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate" title={company.name}>
                                            {company.name}
                                        </h3>
                                        <div className="flex gap-2 mt-1">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                {company.category?.name || 'Uncategorized'}
                                            </span>
                                            {company.vatPercentage !== null && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-ok/10 text-status-ok border border-status-ok/20">
                                                    VAT {company.vatPercentage}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="relative dropdown-container">
                                    <button 
                                        onClick={(e) => {
                                            const menu = e.currentTarget.nextElementSibling;
                                            menu?.classList.toggle('hidden');
                                        }}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                    <div className="hidden absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 z-10 py-1">
                                        <button onClick={() => router.push(`/dashboard/companies/${company.id}`)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Edit</button>
                                        {!company.isObsolete && (
                                            <button onClick={() => handleObsoleteToggle(company.id)} className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">Mark Obsolete</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Content */}
                            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                {company.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="truncate">{company.email}</span>
                                    </div>
                                )}
                                {company.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span>{company.phone}</span>
                                    </div>
                                )}
                                {company.website && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                        <a
                                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                                        >
                                            {company.website}
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Card Footer */}
                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex gap-4">
                                    <span>{company._count?.projects || 0} Projects</span>
                                    <span>{company._count?.invoices || 0} Invoices</span>
                                </div>
                                <Link
                                    href={`/dashboard/companies/${company.id}`}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    View Details
                                </Link>
                            </div>
                        </div>
                    ))}

                    {filteredCompanies.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mb-4">
                                <Building2 className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                No companies found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                                Get started by adding your first client, supplier, or partner company.
                            </p>
                            <Link
                                href="/dashboard/companies/new"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                            >
                                Add Company
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

