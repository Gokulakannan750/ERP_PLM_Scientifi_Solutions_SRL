'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Paperclip, Trash2, Upload, ChevronDown } from 'lucide-react';
import api from '@/lib/api';

const STATUS_FLOW: Record<string, string[]> = {
    RAISED:       ['UNDER_REVIEW', 'CANCELLED'],
    UNDER_REVIEW: ['APPROVED', 'CANCELLED'],
    APPROVED:     ['ORDERED', 'CANCELLED'],
    ORDERED:      ['RECEIVED', 'CANCELLED'],
    RECEIVED:     [],
    CANCELLED:    [],
};

const statusColors: Record<string, string> = {
    RAISED:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    APPROVED:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ORDERED:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    RECEIVED:     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    CANCELLED:    'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export default function PurchaseRequestDetailPage() {
    const { id }   = useParams();
    const router   = useRouter();
    const fileRef  = useRef<HTMLInputElement>(null);
    const [pr, setPr]           = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing]   = useState(false);
    const [uploading, setUploading] = useState(false);

    // For ORDERED / RECEIVED extra fields
    const [poNumber, setPoNumber]   = useState('');
    const [actPrice, setActPrice]   = useState('');
    const [recvQty, setRecvQty]     = useState('');
    const [showExtra, setShowExtra] = useState(false);
    const [nextStatus, setNextStatus] = useState('');

    useEffect(() => { fetchPR(); }, [id]);

    const fetchPR = async () => {
        try {
            const res = await api.get(`/purchase-requests/${id}`);
            setPr(res.data);
        } catch { } finally { setLoading(false); }
    };

    const handleStatusChange = async (status: string) => {
        if (['ORDERED', 'RECEIVED'].includes(status)) {
            setNextStatus(status);
            setShowExtra(true);
            return;
        }
        setActing(true);
        try {
            await api.put(`/purchase-requests/${id}/status`, { status });
            setPr((p: any) => ({ ...p, status }));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed');
        } finally { setActing(false); }
    };

    const handleExtraSubmit = async () => {
        setActing(true);
        try {
            const payload: any = { status: nextStatus };
            if (poNumber)  payload.purchaseOrderNumber = poNumber;
            if (actPrice)  payload.actualUnitPrice     = actPrice;
            if (recvQty)   payload.receivedQuantity    = recvQty;
            if (actPrice && recvQty) payload.actualTotalCost = parseFloat(actPrice) * parseFloat(recvQty);
            await api.put(`/purchase-requests/${id}/status`, payload);
            setShowExtra(false);
            fetchPR();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed');
        } finally { setActing(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this request?')) return;
        try {
            await api.delete(`/purchase-requests/${id}`);
            router.push('/dashboard/purchase-requests');
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            await api.post(`/purchase-requests/${id}/documents`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchPR();
        } catch { alert('Upload failed'); } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleDeleteDoc = async (docId: number) => {
        if (!confirm('Delete document?')) return;
        try {
            await api.delete(`/purchase-requests/${id}/documents/${docId}`);
            setPr((p: any) => ({ ...p, documents: p.documents.filter((d: any) => d.id !== docId) }));
        } catch { alert('Failed to delete document'); }
    };

    if (loading) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    if (!pr) return <div className="text-center p-12 text-gray-500">Request not found.</div>;

    const nextStatuses = STATUS_FLOW[pr.status] || [];
    const isOverdue = pr.requiredByDate && new Date(pr.requiredByDate) < new Date() && !['RECEIVED', 'CANCELLED'].includes(pr.status);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/purchase-requests" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {pr.direction === 'OUTBOUND'
                                ? <ArrowUpRight className="w-5 h-5 text-blue-500" />
                                : <ArrowDownLeft className="w-5 h-5 text-green-500" />}
                            {pr.requestNumber}
                        </h1>
                        <p className="text-sm text-gray-500">{pr.direction === 'OUTBOUND' ? 'Procurement Request' : 'Customer Inquiry'} · {pr.type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[pr.status] || ''}`}>
                        {pr.status.replace('_', ' ')}
                    </span>
                    {nextStatuses.map(ns => (
                        <button key={ns} onClick={() => handleStatusChange(ns)} disabled={acting}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                ns === 'CANCELLED'
                                    ? 'border border-red-300 text-red-600 hover:bg-red-50'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}>
                            {ns.replace('_', ' ')}
                        </button>
                    ))}
                    {['RAISED', 'CANCELLED'].includes(pr.status) && (
                        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    )}
                </div>
            </div>

            {isOverdue && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                    ⚠ This request is overdue — required by {new Date(pr.requiredByDate).toLocaleDateString()}
                </div>
            )}

            {/* Extra fields modal for ORDERED / RECEIVED */}
            {showExtra && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            {nextStatus === 'ORDERED' ? 'Mark as Ordered' : 'Mark as Received'}
                        </h2>
                        {nextStatus === 'ORDERED' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PO Number</label>
                                <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                        )}
                        {nextStatus === 'RECEIVED' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Received Quantity</label>
                                    <input type="number" step="any" value={recvQty} onChange={e => setRecvQty(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Unit Price (₹)</label>
                                    <input type="number" step="any" value={actPrice} onChange={e => setActPrice(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowExtra(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={handleExtraSubmit} disabled={acting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                {acting ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Request Details</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Item</dt>
                            <dd className="text-gray-900 dark:text-white font-medium">{pr.product?.name || pr.freeTextDescription || '—'}</dd>
                        </div>
                        {pr.product?.sku && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">SKU</dt>
                                <dd className="text-gray-700 dark:text-gray-300">{pr.product.sku}</dd>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Quantity</dt>
                            <dd className="text-gray-700 dark:text-gray-300">{Number(pr.quantity)} {pr.unitOfMeasure}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Priority</dt>
                            <dd className={`font-medium ${pr.priority === 'URGENT' ? 'text-red-600' : pr.priority === 'LOW' ? 'text-gray-500' : 'text-amber-600'}`}>
                                {pr.priority}
                            </dd>
                        </div>
                        {pr.estimatedUnitPrice && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Est. Unit Price</dt>
                                <dd className="text-gray-700 dark:text-gray-300">₹{Number(pr.estimatedUnitPrice).toFixed(2)}</dd>
                            </div>
                        )}
                        {pr.totalEstimatedCost && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Est. Total Cost</dt>
                                <dd className="text-gray-900 dark:text-white font-semibold">₹{Number(pr.totalEstimatedCost).toLocaleString()}</dd>
                            </div>
                        )}
                        {pr.requiredByDate && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Required By</dt>
                                <dd className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {new Date(pr.requiredByDate).toLocaleDateString()}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Associations</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">{pr.direction === 'OUTBOUND' ? 'Supplier' : 'Customer'}</dt>
                            <dd className="text-gray-900 dark:text-white">{pr.company?.name || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Project</dt>
                            <dd className="text-gray-900 dark:text-white">
                                {pr.project ? <Link href={`/dashboard/projects/${pr.project.id}`} className="text-blue-600 hover:underline">{pr.project.name}</Link> : '—'}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Requested By</dt>
                            <dd className="text-gray-700 dark:text-gray-300">{pr.requestedBy?.username || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Approved By</dt>
                            <dd className="text-gray-700 dark:text-gray-300">{pr.approvedBy?.username || '—'}</dd>
                        </div>
                        {pr.purchaseOrderNumber && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">PO Number</dt>
                                <dd className="text-gray-700 dark:text-gray-300 font-medium">{pr.purchaseOrderNumber}</dd>
                            </div>
                        )}
                        {pr.receivedQuantity && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Received Qty</dt>
                                <dd className="text-gray-700 dark:text-gray-300">{Number(pr.receivedQuantity)} {pr.unitOfMeasure}</dd>
                            </div>
                        )}
                        {pr.actualTotalCost && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Actual Cost</dt>
                                <dd className="text-gray-900 dark:text-white font-semibold">₹{Number(pr.actualTotalCost).toLocaleString()}</dd>
                            </div>
                        )}
                    </dl>
                    {pr.notes && (
                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{pr.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Documents */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Documents</h2>
                    <button onClick={() => fileRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
                        <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                    <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
                {pr.documents?.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No documents attached</p>
                ) : (
                    <ul className="space-y-2">
                        {pr.documents?.map((doc: any) => (
                            <li key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{doc.fileName}</span>
                                    <span className="text-xs text-gray-400">({(doc.fileSize / 1024).toFixed(1)} KB)</span>
                                </div>
                                <button onClick={() => handleDeleteDoc(doc.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
