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

export default function EditOfferPage() {
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/offers"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Edit Quote
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {offer ? `Updating offer #${offer.offerNumber}` : 'Update quotation details'}
                    </p>
                </div>
            </div>

            {offer && <OfferForm initialData={offer} isEditing={true} />}
        </div>
    );
}
