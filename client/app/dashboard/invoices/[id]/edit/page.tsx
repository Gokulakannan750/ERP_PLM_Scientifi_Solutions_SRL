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

export default function EditInvoicePage() {
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
                            Edit Invoice
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice ? `Updating #${invoice.invoiceNumber}` : 'Update invoice details'}
                        </p>
                    </div>
                </div>

                {invoice && (
                    <PDFDownloadLink
                        document={<InvoicePDF invoice={invoice} />}
                        fileName={`Invoice_${invoice.invoiceNumber}.pdf`}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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

            {invoice && <InvoiceForm initialData={invoice} isEditing={true} />}
        </div>
    );
}
