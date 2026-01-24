'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreVertical, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import api from '@/lib/api';
import ProductHistoryModal from '@/components/modals/ProductHistoryModal';

interface Product {
    id: number;
    sku: string;
    name: string;
    price: string;
    quantity: number;
    minLevel: number;
    version?: number;
    supplier?: {
        name: string;
    };
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/inventory');
            setProducts(response.data);
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewHistory = (productId: number) => {
        setSelectedProductId(productId);
        setShowHistory(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Manage your products and stock levels
                    </p>
                </div>
                <Link
                    href="/dashboard/inventory/new"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Product
                </Link>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white dark:bg-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-medium text-sm">Product Name</th>
                                <th className="px-6 py-4 font-medium text-sm">SKU</th>
                                <th className="px-6 py-4 font-medium text-sm">Version</th>
                                <th className="px-6 py-4 font-medium text-sm">Stock Level</th>
                                <th className="px-6 py-4 font-medium text-sm">Price</th>
                                <th className="px-6 py-4 font-medium text-sm">Supplier</th>
                                <th className="px-6 py-4 font-medium text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {product.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                            {product.sku}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                            v{product.version || 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${product.quantity <= product.minLevel
                                                ? 'text-red-600 dark:text-red-400'
                                                : 'text-gray-900 dark:text-white'
                                                }`}>
                                                {product.quantity}
                                            </span>
                                            {product.quantity <= product.minLevel && (
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 dark:text-white">
                                        ₹{product.price}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                        {product.supplier?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleViewHistory(product.id)}
                                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                title="View History"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                            <Link
                                                href={`/dashboard/inventory/${product.id}`}
                                                className="text-blue-600 hover:text-blue-700 font-medium text-sm px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                Edit
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                                            <p className="text-lg font-medium text-gray-900 dark:text-white">No products found</p>
                                            <p className="text-sm">Add products to your inventory to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product History Modal */}
            {selectedProductId && (
                <ProductHistoryModal
                    productId={selectedProductId}
                    isOpen={showHistory}
                    onClose={() => {
                        setShowHistory(false);
                        setSelectedProductId(null);
                    }}
                />
            )}
        </div>
    );
}
