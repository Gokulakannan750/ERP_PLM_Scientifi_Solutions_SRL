'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, CreditCard, X, Pencil, Send, Bell } from 'lucide-react';
import InvoiceForm from '@/components/forms/InvoiceForm';
import api from '@/lib/api';
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
    discountPercent?: number;
    discountAmount?: number;
    notes: string;
    poNumber?: string;
    poDate?: string;
    paymentMethod?: string;
    paymentDate?: string;
    items: any[];
    company: { name: string; email?: string };
    offerId?: number;
}

export default function ViewInvoicePage() {
    const { id } = useParams();
    const router  = useRouter();
    const [invoice, setInvoice]   = useState<Invoice | null>(null);
    const [loading, setLoading]   = useState(true);
    const [showPayment, setShowPayment]   = useState(false);
    const [payMethod, setPayMethod]       = useState('BANK_TRANSFER');
    const [payDate, setPayDate]           = useState(new Date().toISOString().split('T')[0]);
    const [paying, setPaying]             = useState(false);
    const [showSend, setShowSend]         = useState(false);
    const [sendEmail, setSendEmail]       = useState('');
    const [sending, setSending]           = useState(false);
    const [sendMode, setSendMode]         = useState<'send' | 'reminder'>('send');

    useEffect(() => { fetchInvoice(); }, [id]);

    const fetchInvoice = async () => {
        try {
            const res = await api.get(`/invoices/${id}`);
            setInvoice(res.data);
        } catch { } finally { setLoading(false); }
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            await api.put(`/invoices/${id}/status`, { status: newStatus });
            setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
        } catch { alert('Failed to update status'); }
    };

    const handleSend = async () => {
        setSending(true);
        try {
            const endpoint = sendMode === 'send' ? `/invoices/${id}/send` : `/invoices/${id}/reminder`;
            const res = await api.post(endpoint, { recipientEmail: sendEmail || undefined });
            alert(res.data.message);
            setShowSend(false);
            setSendEmail('');
            fetchInvoice();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to send. Check SMTP configuration.');
        } finally { setSending(false); }
    };

    const handleRecordPayment = async () => {
        setPaying(true);
        try {
            const res = await api.put(`/invoices/${id}/payment`, { paymentMethod: payMethod, paymentDate: payDate });
            setInvoice(prev => prev ? { ...prev, ...res.data } : null);
            setShowPayment(false);
        } catch { alert('Failed to record payment'); }
        finally { setPaying(false); }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    }

    const statusColors: Record<string, string> = {
        PAID:      'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        OVERDUE:   'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        UNPAID:    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
        DRAFT:     'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
        CANCELLED: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/invoices" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice ? `#${invoice.invoiceNumber}` : ''}
                            {invoice?.poNumber ? ` · PO: ${invoice.poNumber}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Edit */}
                    <Link href={`/dashboard/invoices/${id}/edit`}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <Pencil className="w-4 h-4" /> Edit
                    </Link>

                    {/* Credit Note */}
                    {invoice && invoice.status !== 'CANCELLED' && (
                        <Link href={`/dashboard/credit-notes/new?invoiceId=${id}`}
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Credit Note
                        </Link>
                    )}

                    {/* Send Invoice */}
                    {invoice && invoice.status !== 'CANCELLED' && (
                        <button onClick={() => { setSendMode('send'); setShowSend(true); setSendEmail(invoice.company?.email || ''); }}
                            className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Send className="w-4 h-4" /> Send
                        </button>
                    )}

                    {/* Payment Reminder */}
                    {invoice && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                        <button onClick={() => { setSendMode('reminder'); setShowSend(true); setSendEmail(invoice.company?.email || ''); }}
                            className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                            <Bell className="w-4 h-4" /> Reminder
                        </button>
                    )}

                    {/* Record Payment */}
                    {invoice && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                        <button onClick={() => setShowPayment(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                            <CreditCard className="w-4 h-4" /> Record Payment
                        </button>
                    )}

                    {/* Status dropdown */}
                    {invoice && (
                        <div className="relative">
                            <select value={invoice.status} onChange={e => handleStatusChange(e.target.value)}
                                className={`appearance-none cursor-pointer pl-4 pr-8 py-2 rounded-lg font-medium text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusColors[invoice.status] || statusColors.DRAFT}`}>
                                <option value="DRAFT">Draft</option>
                                <option value="UNPAID">Unpaid</option>
                                <option value="PAID">Paid</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    )}

                    {/* PDF Download */}
                    {invoice && (
                        <PDFDownloadLink document={<InvoicePDF invoice={invoice} />} fileName={`Invoice_${invoice.invoiceNumber}.pdf`}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600">
                            {({ loading: l }) => l ? 'Generating...' : <><Download className="w-4 h-4" /> PDF</>}
                        </PDFDownloadLink>
                    )}
                </div>
            </div>

            {/* Payment info banner if paid */}
            {invoice?.status === 'PAID' && invoice.paymentMethod && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
                    Paid via <strong>{invoice.paymentMethod.replace('_', ' ')}</strong>
                    {invoice.paymentDate && <> on <strong>{new Date(invoice.paymentDate).toLocaleDateString()}</strong></>}
                </div>
            )}

            {invoice && <InvoiceForm key={invoice.id} initialData={invoice} isReadOnly={true} />}

            {/* Record Payment Modal */}
            {showPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Record Payment</h2>
                            <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CASH">Cash</option>
                                    <option value="CREDIT_CARD">Credit Card</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setShowPayment(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={handleRecordPayment} disabled={paying}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                                {paying ? 'Recording...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send / Reminder Modal */}
            {showSend && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {sendMode === 'send' ? 'Send Invoice' : 'Send Payment Reminder'}
                            </h2>
                            <button onClick={() => setShowSend(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {sendMode === 'send'
                                    ? 'Invoice will be sent as an HTML email to the recipient.'
                                    : 'A payment reminder will be emailed to the recipient.'}
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Recipient Email
                                </label>
                                <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                                    placeholder={invoice?.company?.email || 'client@example.com'}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                <p className="text-xs text-gray-400 mt-1">Leave blank to use the company email on file.</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setShowSend(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={handleSend} disabled={sending}
                                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${sendMode === 'send' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                                {sending ? 'Sending...' : sendMode === 'send' ? 'Send Invoice' : 'Send Reminder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
