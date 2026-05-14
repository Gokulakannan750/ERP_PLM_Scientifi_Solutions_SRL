'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ProductForm from '@/components/forms/ProductForm';
import api from '@/lib/api';
import { useParams } from 'next/navigation';

interface Product {
    id: number;
    sku: string;
    name: string;
    description: string;
    price: string;
    quantity: number;
    minLevel: number;
    maxLevel: number;
    supplierId: number;
}

export default function EditProductPage() {
    const { id } = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            const response = await api.get(`/inventory/${id}`);
            setProduct(response.data);
        } catch (error) {
            console.error('Failed to fetch product:', error);
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
                    href="/dashboard/inventory"
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Edit Product
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update product details and stock information
                    </p>
                </div>
            </div>

            {product && <ProductForm initialData={product} isEditing={true} />}
        </div>
    );
}
