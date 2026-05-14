'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreVertical, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, History, PackagePlus, PackageMinus } from 'lucide-react';
import api from '@/lib/api';
import ProductHistoryModal from '@/components/modals/ProductHistoryModal';
import StockCheckInModal from '@/components/modals/StockCheckInModal';
import StockCheckOutModal from '@/components/modals/StockCheckOutModal';

interface Product {
    id: number;
    sku: string;
    name: string;
    price: string;
    quantity: number;
    minLevel: number;
    version?: number;
    categoryCode?: string;
    subcategoryCode?: string;
    supplier?: {
        name: string;
    };
}

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [selectedProductDetails, setSelectedProductDetails] = useState<{name: string, quantity: number} | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [showObsolete, setShowObsolete] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, [showObsolete]);

    const fetchProducts = async () => {
        try {
            const response = await api.get(`/inventory?showObsolete=${showObsolete}`);
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
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-background dark:bg-gray-950 text-gray-900 dark:text-white"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={showObsolete}
                            onChange={(e) => setShowObsolete(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">Show Obsolete</span>
                    </label>
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
                                <th className="px-6 py-4 font-medium text-sm">Category</th>
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
                                        <div className="flex flex-col gap-1">
                                            {product.categoryCode ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                                    {product.categoryCode} {product.subcategoryCode ? `/ ${product.subcategoryCode}` : ''}
                                                </span>
                                            ) : <span className="text-gray-400 text-xs">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-status-info/10 text-status-info">
                                            v{product.version || 1}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${product.quantity <= product.minLevel
                                                ? 'text-status-error'
                                                : 'text-gray-900 dark:text-white'
                                                }`}>
                                                {product.quantity}
                                            </span>
                                            {product.quantity <= product.minLevel && (
                                                <span title="Low Stock">
                                                    <AlertTriangle className="w-4 h-4 text-status-error" />
                                                </span>
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
                                                onClick={() => {
                                                    setSelectedProductId(product.id);
                                                    setSelectedProductDetails({ name: product.name, quantity: product.quantity });
                                                    setShowCheckIn(true);
                                                }}
                                                className="text-green-600 hover:text-green-700 p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                title="Check In Stock"
                                            >
                                                <PackagePlus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedProductId(product.id);
                                                    setSelectedProductDetails({ name: product.name, quantity: product.quantity });
                                                    setShowCheckOut(true);
                                                }}
                                                className="text-amber-600 hover:text-amber-700 p-1.5 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                title="Check Out Stock"
                                            >
                                                <PackageMinus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleViewHistory(product.id)}
                                                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-2 border-l border-gray-200 dark:border-gray-700"
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

            {/* Check In Modal */}
            {selectedProductId && selectedProductDetails && (
                <StockCheckInModal
                    productId={selectedProductId}
                    productName={selectedProductDetails.name}
                    isOpen={showCheckIn}
                    onClose={() => {
                        setShowCheckIn(false);
                        setSelectedProductId(null);
                        setSelectedProductDetails(null);
                    }}
                    onSuccess={() => {
                        setShowCheckIn(false);
                        setSelectedProductId(null);
                        setSelectedProductDetails(null);
                        fetchProducts();
                    }}
                />
            )}

            {/* Check Out Modal */}
            {selectedProductId && selectedProductDetails && (
                <StockCheckOutModal
                    productId={selectedProductId}
                    productName={selectedProductDetails.name}
                    currentStock={selectedProductDetails.quantity}
                    isOpen={showCheckOut}
                    onClose={() => {
                        setShowCheckOut(false);
                        setSelectedProductId(null);
                        setSelectedProductDetails(null);
                    }}
                    onSuccess={() => {
                        setShowCheckOut(false);
                        setSelectedProductId(null);
                        setSelectedProductDetails(null);
                        fetchProducts();
                    }}
                />
            )}
        </div>
    );
}
