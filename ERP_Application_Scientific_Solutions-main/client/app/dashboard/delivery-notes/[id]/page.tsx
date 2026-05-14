'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Truck, Paperclip, Trash2, Upload, Download } from 'lucide-react';
import api from '@/lib/api';
import { PDFDownloadLink } from '@react-pdf/renderer';
import DeliveryNotePDF from '@/components/delivery/DeliveryNotePDF';

const STATUS_FLOW: Record<string, string[]> = {
    DRAFT:     ['READY', 'CANCELLED'],
    READY:     ['SHIPPED', 'CANCELLED'],
    SHIPPED:   ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};

const statusColors: Record<string, string> = {
    DRAFT:     'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    READY:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    SHIPPED:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    CANCELLED: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export default function DeliveryNoteDetailPage() {
    const { id }   = useParams();
    const router   = useRouter();
    const fileRef  = useRef<HTMLInputElement>(null);
    const [dn, setDn]           = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [acting, setActing]   = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => { fetchDN(); }, [id]);

    const fetchDN = async () => {
        try {
            const res = await api.get(`/delivery-notes/${id}`);
            setDn(res.data);
        } catch { } finally { setLoading(false); }
    };

    const handleStatusChange = async (status: string) => {
        if (status === 'SHIPPED' && !confirm('Mark as shipped? This will decrement product stock for all line items with a linked product.')) return;
        setActing(true);
        try {
            await api.put(`/delivery-notes/${id}/status`, { status });
            setDn((prev: any) => ({
                ...prev, status,
                shippedAt:   status === 'SHIPPED'   ? new Date().toISOString() : prev.shippedAt,
                deliveredAt: status === 'DELIVERED' ? new Date().toISOString() : prev.deliveredAt,
            }));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to update status');
        } finally { setActing(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this delivery note?')) return;
        try {
            await api.delete(`/delivery-notes/${id}`);
            router.push('/dashboard/delivery-notes');
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
            await api.post(`/delivery-notes/${id}/documents`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            fetchDN();
        } catch { alert('Upload failed'); } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleDeleteDoc = async (docId: number) => {
        if (!confirm('Delete document?')) return;
        try {
            await api.delete(`/delivery-notes/${id}/documents/${docId}`);
            setDn((prev: any) => ({ ...prev, documents: prev.documents.filter((d: any) => d.id !== docId) }));
        } catch { alert('Failed to delete document'); }
    };

    if (loading) return <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
    if (!dn) return <div className="text-center p-12 text-gray-500">Delivery note not found.</div>;

    const nextStatuses = STATUS_FLOW[dn.status] || [];

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/delivery-notes" className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-500" /> {dn.deliveryNumber}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{dn.company?.name}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[dn.status] || ''}`}>
                        {dn.status}
                    </span>
                    {nextStatuses.map(ns => (
                        <button key={ns} onClick={() => handleStatusChange(ns)} disabled={acting}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                ns === 'CANCELLED'
                                    ? 'border border-red-300 text-red-600 hover:bg-red-50'
                                    : ns === 'SHIPPED'
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : ns === 'DELIVERED'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}>
                            {acting ? '...' : ns}
                        </button>
                    ))}
                    {['DRAFT', 'CANCELLED'].includes(dn.status) && (
                        <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                    )}
                    <PDFDownloadLink document={<DeliveryNotePDF dn={dn} />} fileName={`${dn.deliveryNumber}.pdf`}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:border-gray-600">
                        {({ loading: l }) => l ? 'Generating...' : <><Download className="w-4 h-4" /> PDF</>}
                    </PDFDownloadLink>
                </div>
            </div>

            {/* Status timeline */}
            {dn.shippedAt && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                    Shipped on <strong>{new Date(dn.shippedAt).toLocaleDateString()}</strong>
                    {dn.carrier && <> via <strong>{dn.carrier}</strong></>}
                    {dn.trackingNumber && <> · Tracking: <strong className="font-mono">{dn.trackingNumber}</strong></>}
                </div>
            )}
            {dn.deliveredAt && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
                    Delivered on <strong>{new Date(dn.deliveredAt).toLocaleDateString()}</strong>
                </div>
            )}

            {/* Details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: References */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">References</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Client</dt>
                            <dd className="text-gray-900 dark:text-white font-medium">{dn.company?.name}</dd>
                        </div>
                        {dn.invoice && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Invoice</dt>
                                <dd><Link href={`/dashboard/invoices/${dn.invoice.id}`} className="text-blue-600 hover:underline">#{dn.invoice.invoiceNumber}</Link></dd>
                            </div>
                        )}
                        {dn.project && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Project</dt>
                                <dd><Link href={`/dashboard/projects/${dn.project.id}`} className="text-blue-600 hover:underline">{dn.project.name}</Link></dd>
                            </div>
                        )}
                        {dn.customerPoNumber && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Customer PO</dt>
                                <dd className="text-gray-700 dark:text-gray-300 font-mono">{dn.customerPoNumber}</dd>
                            </div>
                        )}
                        {dn.deliveryDate && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Delivery Date</dt>
                                <dd className="text-gray-700 dark:text-gray-300">{new Date(dn.deliveryDate).toLocaleDateString()}</dd>
                            </div>
                        )}
                        {dn.deliveryAddress && (
                            <div>
                                <dt className="text-gray-500 mb-1">Delivery Address</dt>
                                <dd className="text-gray-700 dark:text-gray-300 text-xs whitespace-pre-line">{dn.deliveryAddress}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Right: Shipping */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Shipping Details</h2>
                    <dl className="space-y-3 text-sm">
                        {dn.carrier && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Carrier</dt>
                                <dd className="text-gray-900 dark:text-white">{dn.carrier}</dd>
                            </div>
                        )}
                        {dn.trackingNumber && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Tracking</dt>
                                <dd className="text-gray-700 dark:text-gray-300 font-mono text-xs">{dn.trackingNumber}</dd>
                            </div>
                        )}
                        {dn.incoterms && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Incoterms</dt>
                                <dd className="text-gray-700 dark:text-gray-300 font-medium">{dn.incoterms}</dd>
                            </div>
                        )}
                        {dn.packageType && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Package Type</dt>
                                <dd className="text-gray-700 dark:text-gray-300">{dn.packageType.replace('_', ' ')}</dd>
                            </div>
                        )}
                        {dn.packageCount && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Packages</dt>
                                <dd className="text-gray-700 dark:text-gray-300">{dn.packageCount}</dd>
                            </div>
                        )}
                        {dn.weightKg && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Weight</dt>
                                <dd className="text-gray-700 dark:text-gray-300">{Number(dn.weightKg)} kg</dd>
                            </div>
                        )}
                        {(dn.dimensionL || dn.dimensionW || dn.dimensionH) && (
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Dimensions (L×W×H)</dt>
                                <dd className="text-gray-700 dark:text-gray-300">
                                    {[dn.dimensionL, dn.dimensionW, dn.dimensionH].map(d => d ? Number(d) : 0).join(' × ')} cm
                                </dd>
                            </div>
                        )}
                    </dl>
                    {dn.notes && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{dn.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Line Items</h2>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs">
                        <tr>
                            <th className="px-6 py-3 text-left font-medium">Description</th>
                            <th className="px-6 py-3 text-center font-medium">Qty</th>
                            <th className="px-6 py-3 text-left font-medium">Unit</th>
                            <th className="px-6 py-3 text-left font-medium">Serial / Batch</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {dn.items?.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No items</td></tr>
                        )}
                        {dn.items?.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-3 text-gray-900 dark:text-white">{item.description}</td>
                                <td className="px-6 py-3 text-center text-gray-700 dark:text-gray-300">{Number(item.quantity)}</td>
                                <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{item.unitOfMeasure}</td>
                                <td className="px-6 py-3 text-gray-500 text-xs">
                                    {item.serialNumbers && <span>S/N: {item.serialNumbers}</span>}
                                    {item.batchNumber && <span className="ml-2">Batch: {item.batchNumber}</span>}
                                    {!item.serialNumbers && !item.batchNumber && '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
                {!dn.documents?.length ? (
                    <p className="text-sm text-gray-400 text-center py-6">No documents attached</p>
                ) : (
                    <ul className="space-y-2">
                        {dn.documents.map((doc: any) => (
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
