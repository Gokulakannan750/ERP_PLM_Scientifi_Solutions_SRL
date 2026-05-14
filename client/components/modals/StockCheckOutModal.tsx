import { useState } from 'react';
import { X, PackageMinus, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface StockCheckOutModalProps {
    productId: number;
    productName: string;
    currentStock: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function StockCheckOutModal({ productId, productName, currentStock, isOpen, onClose, onSuccess }: StockCheckOutModalProps) {
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('Production Issue');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const qty = parseInt(quantity);
        if (qty <= 0) {
            setError('Quantity must be greater than 0');
            setLoading(false);
            return;
        }

        if (qty > currentStock) {
            setError(`Cannot check out more than current stock (${currentStock})`);
            setLoading(false);
            return;
        }

        try {
            await api.post(`/inventory/${productId}/check-out`, {
                quantity: qty,
                reason,
            });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to check out stock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <PackageMinus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Check Out Stock</h2>
                            <p className="text-sm text-gray-500">{productName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Current Available Stock: <strong className="text-lg">{currentStock}</strong>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantity to Issue *
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            max={currentStock}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Reason / Reference *
                        </label>
                        <input
                            type="text"
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="e.g. Sales Order #123, Production Run B"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Processing...' : 'Confirm Issue'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
