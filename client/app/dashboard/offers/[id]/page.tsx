'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import OfferForm from '@/components/forms/OfferForm';
import api from '@/lib/api';
import { useParams } from 'next/navigation';

interface Offer {
    id: number;
    offerNumber: string;
    totalAmount: string;
    status: string;
    validUntil: string;
    createdAt: string;
    description: string;
    companyId: number;
    taxRate: number;
    items: any[];
    company: {
        name: string;
    };
}

export default function ViewOfferPage() {
    const { id } = useParams();
    const [offer, setOffer] = useState<Offer | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOffer();
    }, [id]);

    const fetchOffer = async () => {
        try {
            const response = await api.get(`/offers/${id}`);
            setOffer(response.data);
        } catch (error) {
            console.error('Failed to fetch offer:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await api.put(`/offers/${id}/status`, { status: newStatus });
            setOffer(prev => prev ? { ...prev, status: newStatus } : null);
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status');
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
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/offers"
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            View Quote
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {offer ? `Quote #${offer.offerNumber} Details` : 'Quote details'}
                        </p>
                    </div>
                </div>

                {offer && (
                    <div className="relative">
                        <select
                            value={offer.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-lg font-medium text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                                ${offer.status.toUpperCase() === 'ACCEPTED' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                                offer.status.toUpperCase() === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                offer.status.toUpperCase() === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                                'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}
                            `}
                        >
                            <option value="DRAFT">Draft</option>
                            <option value="SENT">Sent</option>
                            <option value="ACCEPTED">Accepted</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="w-4 h-4 text-current opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>
                )}
            </div>

            {offer && <OfferForm key={offer.status} initialData={offer} isReadOnly={true} />}
        </div>
    );
}
