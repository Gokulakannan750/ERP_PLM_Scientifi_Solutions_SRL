'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import CompanyForm from '@/components/forms/CompanyForm';
import api from '@/lib/api';
import { useParams } from 'next/navigation';

interface Company {
    id: number;
    name: string;
    email: string;
    phone: string;
    website: string;
    categoryId: number;
    addresses: any[];
}

export default function EditCompanyPage() {
    const { id } = useParams();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompany();
    }, [id]);

    const fetchCompany = async () => {
        try {
            const response = await api.get(`/companies/${id}`);
            setCompany(response.data);
        } catch (error) {
            console.error('Failed to fetch company:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/companies"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Edit Company
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update company details and information
                    </p>
                </div>
            </div>

            {company && <CompanyForm initialData={company} isdEditing={true} />}
        </div>
    );
}
