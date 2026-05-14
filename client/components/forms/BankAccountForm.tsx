'use client';

import { useState } from 'react';
import { Plus, X, Building, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';

interface BankAccount {
    id: number;
    bankName: string;
    accountNumber: string | null;
    iban: string | null;
    bicSwift: string | null;
    routingNumber: string | null;
    bankAddress: string | null;
    isDefault: boolean;
}

interface BankAccountFormProps {
    companyId: number;
    accounts: BankAccount[];
    onAccountAdded: (account: BankAccount) => void;
    onAccountDeleted: (accountId: number) => void;
    onAccountUpdated: (account: BankAccount) => void;
}

export default function BankAccountForm({ companyId, accounts, onAccountAdded, onAccountDeleted, onAccountUpdated }: BankAccountFormProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        iban: '',
        bicSwift: '',
        routingNumber: '',
        bankAddress: '',
        isDefault: false
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(`/companies/${companyId}/bank-accounts`, formData);
            onAccountAdded(res.data);
            setIsAdding(false);
            setFormData({ bankName: '', accountNumber: '', iban: '', bicSwift: '', routingNumber: '', bankAddress: '', isDefault: false });
        } catch (err) {
            console.error('Failed to add bank account', err);
            alert('Failed to add bank account');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this bank account?')) return;
        try {
            await api.delete(`/companies/${companyId}/bank-accounts/${id}`);
            onAccountDeleted(id);
        } catch (err) {
            console.error('Failed to delete', err);
            alert('Failed to delete bank account');
        }
    };

    const setAsDefault = async (account: BankAccount) => {
        if (account.isDefault) return;
        try {
            const res = await api.put(`/companies/${companyId}/bank-accounts/${account.id}`, {
                ...account,
                isDefault: true
            });
            onAccountUpdated(res.data);
        } catch (err) {
            console.error('Failed to update default status', err);
            alert('Failed to update bank account');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Bank Accounts</h3>
                {!isAdding && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Account
                    </button>
                )}
            </div>

            {/* Add Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.bankName}
                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                            <input
                                type="text"
                                value={formData.accountNumber}
                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">IBAN</label>
                            <input
                                type="text"
                                value={formData.iban}
                                onChange={e => setFormData({ ...formData, iban: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">BIC / SWIFT</label>
                            <input
                                type="text"
                                value={formData.bicSwift}
                                onChange={e => setFormData({ ...formData, bicSwift: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.isDefault}
                                    onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                Set as default bank account
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Adding...' : 'Save Account'}
                        </button>
                    </div>
                </form>
            )}

            {/* List */}
            {accounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.map(acc => (
                        <div key={acc.id} className={`p-4 rounded-xl border relative transition-colors ${acc.isDefault ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'}`}>
                            {acc.isDefault && (
                                <div className="absolute top-3 right-3 text-blue-600 dark:text-blue-400" title="Default Account">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            )}
                            <div className="flex gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${acc.isDefault ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                                    <Building className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 dark:text-white pr-6">{acc.bankName}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Account: {acc.accountNumber || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="space-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 text-xs text-gray-600 dark:text-gray-400">
                                {acc.iban && <div className="flex justify-between"><span>IBAN:</span> <span className="font-mono">{acc.iban}</span></div>}
                                {acc.bicSwift && <div className="flex justify-between"><span>BIC/SWIFT:</span> <span className="font-mono">{acc.bicSwift}</span></div>}
                            </div>
                            <div className="mt-4 flex gap-2 justify-end">
                                {!acc.isDefault && (
                                    <button
                                        type="button"
                                        onClick={() => setAsDefault(acc)}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Set as Default
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(acc.id)}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium ml-2"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                !isAdding && (
                    <div className="text-center p-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        <Building className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No bank accounts added yet.</p>
                    </div>
                )
            )}
        </div>
    );
}
