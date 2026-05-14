'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, X, Copy, FileText, ThumbsDown, Pencil, Download, Send } from 'lucide-react';
import OfferForm from '@/components/forms/OfferForm';
import api from '@/lib/api';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OfferPDF from '@/components/offers/OfferPDF';

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
    version: number;
    rejectionReason?: string;
    parentOfferId?: number;
    items: any[];
    company: { name: string };
    invoice?: { id: number; invoiceNumber: string } | null;
}

export default function ViewOfferPage() {
    const { id } = useParams();
    const router  = useRouter();
    const [offer, setOffer]             = useState<Offer | null>(null);
    const [loading, setLoading]         = useState(true);
    const [showReject, setShowReject]   = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejecting, setRejecting]     = useState(false);
    const [duplicating, setDuplicating] = useState(false);
    const [converting, setConverting]   = useState(false);

    useEffect(() => { fetchOffer(); }, [id]);

    const fetchOffer = async () => {
        try {
            const res = await api.get(`/offers/${id}`);
            setOffer(res.data);
        } catch { } finally { setLoading(false); }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'REJECTED') { setShowReject(true); return; }
        try {
            await api.put(`/offers/${id}/status`, { status: newStatus });
            setOffer(prev => prev ? { ...prev, status: newStatus } : null);
        } catch { alert('Failed to update status'); }
    };

    const handleReject = async () => {
        setRejecting(true);
        try {
            const res = await api.put(`/offers/${id}/reject`, { rejectionReason: rejectReason });
            setOffer(prev => prev ? { ...prev, status: 'REJECTED', rejectionReason: rejectReason } : null);
            setShowReject(false);
            setRejectReason('');
        } catch { alert('Failed to reject offer'); }
        finally { setRejecting(false); }
    };

    const handleDuplicate = async () => {
        setDuplicating(true);
        try {
            const res = await api.post(`/offers/${id}/duplicate`);
            router.push(`/dashboard/offers/${res.data.id}`);
        } catch { alert('Failed to duplicate offer'); }
        finally { setDuplicating(false); }
    };

    const handleConvertToInvoice = async () => {
        if (!confirm('Convert this accepted offer to an invoice?')) return;
        setConverting(true);
        try {
            const res = await api.post('/invoices/from-offer', { offerId: offer?.id });
            router.push(`/dashboard/invoices/${res.data.id}`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to convert to invoice');
        } finally { setConverting(false); }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    }

    const statusColors: Record<string, string> = {
        ACCEPTED:  'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        REJECTED:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        SENT:      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        EXPIRED:   'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        CONVERTED: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
        DRAFT:     'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:border-gray-700',
    };

    const canConvert = offer?.status === 'ACCEPTED' && !offer.invoice;
    const isEditable = offer && !['CONVERTED', 'ACCEPTED'].includes(offer.status);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/offers" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Quote
                            {offer && (
                                <span className="text-sm font-normal text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                    v{offer.version}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {offer ? `#${offer.offerNumber}` : ''}
                            {offer?.parentOfferId ? ` · Duplicated from #${offer.parentOfferId}` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Edit */}
                    {isEditable && (
                        <Link href={`/dashboard/offers/${id}/edit`}
                            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <Pencil className="w-4 h-4" /> Edit
                        </Link>
                    )}

                    {/* Duplicate */}
                    <button onClick={handleDuplicate} disabled={duplicating}
                        className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                        <Copy className="w-4 h-4" /> {duplicating ? 'Duplicating...' : 'Duplicate'}
                    </button>

                    {/* Reject */}
                    {offer && !['REJECTED', 'CONVERTED'].includes(offer.status) && (
                        <button onClick={() => setShowReject(true)}
                            className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <ThumbsDown className="w-4 h-4" /> Reject
                        </button>
                    )}

                    {/* Convert to Invoice */}
                    {canConvert && (
                        <button onClick={handleConvertToInvoice} disabled={converting}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50">
                            <FileText className="w-4 h-4" /> {converting ? 'Converting...' : 'Convert to Invoice'}
                        </button>
                    )}

                    {/* PDF Download */}
                    {offer && (
                        <PDFDownloadLink
                            document={<OfferPDF offer={offer} />}
                            fileName={`Quote_${offer.offerNumber}.pdf`}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600"
                        >
                            {({ loading: l }) => l ? 'Generating...' : <><Download className="w-4 h-4" /> PDF</>}
                        </PDFDownloadLink>
                    )}

                    {/* Invoice link if already converted */}
                    {offer?.invoice && (
                        <Link href={`/dashboard/invoices/${offer.invoice.id}`}
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
                            <FileText className="w-4 h-4" /> View Invoice #{offer.invoice.invoiceNumber}
                        </Link>
                    )}

                    {/* Status dropdown */}
                    {offer && (
                        <div className="relative">
                            <select value={offer.status} onChange={e => handleStatusChange(e.target.value)}
                                className={`appearance-none cursor-pointer pl-4 pr-8 py-2 rounded-lg font-medium text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusColors[offer.status] || statusColors.DRAFT}`}>
                                <option value="DRAFT">Draft</option>
                                <option value="SENT">Sent</option>
                                <option value="ACCEPTED">Accepted</option>
                                <option value="REJECTED">Rejected</option>
                                <option value="EXPIRED">Expired</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Rejection reason banner */}
            {offer?.status === 'REJECTED' && offer.rejectionReason && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                    <span className="font-semibold">Rejection reason: </span>{offer.rejectionReason}
                </div>
            )}

            {/* Converted banner */}
            {offer?.status === 'CONVERTED' && offer.invoice && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-700 dark:text-purple-300">
                    This offer was converted to invoice <strong>#{offer.invoice.invoiceNumber}</strong>.
                </div>
            )}

            {offer && <OfferForm key={offer.id} initialData={offer} isReadOnly={true} />}

            {/* Reject Modal */}
            {showReject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reject Offer</h2>
                            <button onClick={() => setShowReject(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rejection Reason (optional)</label>
                            <textarea
                                rows={3}
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. Price too high, client chose another vendor..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
                            <button onClick={() => setShowReject(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={handleReject} disabled={rejecting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
