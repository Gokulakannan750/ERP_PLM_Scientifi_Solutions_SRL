'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import InvoiceForm from '@/components/forms/InvoiceForm';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from '@/components/invoices/InvoicePDF';

interface Invoice {
    id: number;
    invoiceNumber: string;
    companyId: number;
    status: string;
    date: string;
    dueDate: string;
    taxRate: number;
    notes: string;
    items: any[];
    company: {
        name: string;
        email?: string;
    };
}

export default function ViewInvoicePage() {
    const { id } = useParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoice();
    }, [id]);

    const fetchInvoice = async () => {
        try {
            const response = await api.get(`/invoices/${id}`);
            setInvoice(response.data);
        } catch (error) {
            console.error('Failed to fetch invoice:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await api.put(`/invoices/${id}/status`, { status: newStatus });
            setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
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
                        href="/dashboard/invoices"
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            View Invoice
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice ? `Invoice #${invoice.invoiceNumber} Details` : 'Invoice details'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {invoice && (
                        <div className="relative">
                            <select
                                value={invoice.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className={`appearance-none cursor-pointer pl-4 pr-10 py-2 rounded-lg font-medium text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors
                                    ${invoice.status.toUpperCase() === 'PAID' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                                    invoice.status.toUpperCase() === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                    invoice.status.toUpperCase() === 'UNPAID' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                                    'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}
                                `}
                            >
                                <option value="DRAFT">Draft</option>
                                <option value="PENDING">Pending</option>
                                <option value="UNPAID">Unpaid</option>
                                <option value="PAID">Paid</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="w-4 h-4 text-current opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    )}

                    {invoice && (
                        <PDFDownloadLink
                            document={<InvoicePDF invoice={invoice} />}
                            fileName={`Invoice_${invoice.invoiceNumber}.pdf`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 shadow-sm border border-gray-200 dark:border-gray-600"
                        >
                            {({ blob, url, loading, error }) =>
                                loading ? 'Generating PDF...' : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        Download PDF
                                    </>
                                )
                            }
                        </PDFDownloadLink>
                    )}
                </div>
            </div>

            {invoice && <InvoiceForm key={invoice.status} initialData={invoice} isReadOnly={true} />}
        </div>
    );
}
