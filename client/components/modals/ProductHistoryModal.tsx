'use client';

import { useState, useEffect } from 'react';
import { X, Clock, User, TrendingUp, TrendingDown } from 'lucide-react';

interface ProductVersion {
    id: number;
    name: string;
    sku: string;
    description: string;
    price: string;
    quantity: number;
    minLevel: number;
    maxLevel: number;
    recDate: string;
    isLatest: boolean;
    modifiedBy: {
        id: number;
        name: string;
        email: string;
    };
    supplier?: {
        id: number;
        name: string;
    };
}

interface ProductHistoryModalProps {
    productId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProductHistoryModal({ productId, isOpen, onClose }: ProductHistoryModalProps) {
    const [history, setHistory] = useState<ProductVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && productId) {
            fetchHistory();
        }
    }, [isOpen, productId]);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/inventory/${productId}/versions`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch history');
            const data = await response.json();
            setHistory(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const calculateChange = (current: string | number, previous: string | number) => {
        const curr = parseFloat(String(current));
        const prev = parseFloat(String(previous));
        if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
        const change = ((curr - prev) / prev) * 100;
        return change;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Product Version History
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-600 dark:text-red-400 py-8">
                            {error}
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No version history available
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {history.map((version, index) => {
                                const previousVersion = history[index + 1];
                                const priceChange = previousVersion ? calculateChange(version.price, previousVersion.price) : null;
                                const quantityChange = previousVersion ? parseFloat(String(version.quantity)) - parseFloat(String(previousVersion.quantity)) : null;

                                return (
                                    <div
                                        key={version.id}
                                        className={`relative pl-8 pb-6 ${index !== history.length - 1 ? 'border-l-2 border-gray-200 dark:border-gray-700' : ''
                                            }`}
                                    >
                                        {/* Timeline dot */}
                                        <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${version.isLatest
                                            ? 'bg-blue-600 border-blue-600'
                                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                                            }`} />

                                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                                            {/* Version Badge */}
                                            {version.isLatest && (
                                                <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                                    Current Version
                                                </span>
                                            )}

                                            {/* Product Info */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {version.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    SKU: {version.sku}
                                                </p>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            ₹{parseFloat(version.price).toLocaleString()}
                                                        </p>
                                                        {priceChange !== null && (
                                                            <span className={`flex items-center text-xs ${priceChange > 0 ? 'text-green-600' : 'text-red-600'
                                                                }`}>
                                                                {priceChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                                {Math.abs(priceChange).toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Quantity</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                            {version.quantity}
                                                        </p>
                                                        {quantityChange !== null && quantityChange !== 0 && (
                                                            <span className={`text-xs ${quantityChange > 0 ? 'text-green-600' : 'text-red-600'
                                                                }`}>
                                                                ({quantityChange > 0 ? '+' : ''}{quantityChange})
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Min/Max</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {version.minLevel} / {version.maxLevel}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                        {version.supplier?.name || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {version.description && (
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Description</p>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        {version.description}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    {version.modifiedBy.name || version.modifiedBy.email}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(version.recDate).toLocaleString('en-IN', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short'
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
