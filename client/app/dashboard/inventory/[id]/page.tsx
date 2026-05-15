'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, BarChart2, History, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import ProductForm from '@/components/forms/ProductForm';
import api from '@/lib/api';

interface Movement { id: number; type: string; quantity: number; reason?: string; createdAt: string; }
interface PricePoint { id: number; price: number; recDate: string; isLatest: boolean; }
interface TCO { unitPrice: number; shippingCost: number; importDutyPercent: number; totalCostOfOwnership: number; currency: string; }

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct]       = useState<any>(null);
  const [movements, setMovements]   = useState<Movement[]>([]);
  const [costData, setCostData]     = useState<{ priceHistory: PricePoint[]; movements: Movement[]; tco: TCO | null } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<'details' | 'movements' | 'cost'>('details');
  const [stockModal, setStockModal] = useState<'in' | 'out' | null>(null);
  const [qty, setQty]               = useState('');
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      const [pRes, mRes, cRes] = await Promise.all([
        api.get(`/inventory/${id}`),
        api.get(`/inventory/${id}/history`),
        api.get(`/inventory/${id}/cost-analysis`),
      ]);
      setProduct(pRes.data);
      setMovements(mRes.data);
      setCostData(cRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStockAction = async () => {
    if (!qty || parseInt(qty) <= 0) return;
    setSubmitting(true);
    try {
      const endpoint = stockModal === 'in' ? `/inventory/${id}/check-in` : `/inventory/${id}/check-out`;
      await api.post(endpoint, { quantity: parseInt(qty), reason });
      setStockModal(null); setQty(''); setReason('');
      fetchAll();
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Action failed');
    } finally { setSubmitting(false); }
  };

  const stockStatus = product
    ? product.quantity <= (product.reorderTriggerThreshold ?? product.minLevel ?? 5)
      ? 'critical'
      : product.quantity <= (product.minLevel ?? 5) * 1.5
        ? 'low'
        : 'ok'
    : 'ok';

  const statusColors = { ok: 'text-green-600 bg-green-50 dark:bg-green-500/10', low: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', critical: 'text-red-600 bg-red-50 dark:bg-red-500/10' };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"/></div>;
  if (!product) return <div className="p-8 text-center text-gray-500">Product not found.</div>;

  const tabs = [
    { id: 'details',   label: 'Details',          icon: Package },
    { id: 'movements', label: 'Stock Movements',   icon: History },
    { id: 'cost',      label: 'Cost Analysis',     icon: BarChart2 },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory" className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <ArrowLeft className="w-5 h-5"/>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Stock badge */}
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusColors[stockStatus]}`}>
            {stockStatus === 'critical' && <AlertTriangle className="w-4 h-4"/>}
            {product.quantity} in stock
          </span>
          <button onClick={() => setStockModal('in')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
            <ArrowDownCircle className="w-4 h-4"/> Stock In
          </button>
          <button onClick={() => setStockModal('out')} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors">
            <ArrowUpCircle className="w-4 h-4"/> Stock Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                <Icon className="w-4 h-4"/>{tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Details */}
      {activeTab === 'details' && <ProductForm initialData={product} isEditing={true}/>}

      {/* Tab: Stock Movements */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Movement History</h3>
            <span className="text-sm text-gray-500">{movements.length} records</span>
          </div>
          {movements.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">No stock movements recorded yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-right font-medium">Quantity</th>
                  <th className="px-6 py-3 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${m.type === 'IN' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                        {m.type === 'IN' ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                        {m.type}
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-right font-semibold ${m.type === 'IN' ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {m.type === 'IN' ? '+' : '-'}{m.quantity}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{m.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Cost Analysis */}
      {activeTab === 'cost' && costData && (
        <div className="space-y-6">
          {/* TCO card */}
          {costData.tco && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Unit Price',        value: costData.tco.unitPrice },
                { label: 'Shipping / Item',   value: costData.tco.shippingCost },
                { label: 'Import Duty',       value: `${costData.tco.importDutyPercent}%`, raw: true },
                { label: 'Total Cost (TCO)',  value: costData.tco.totalCostOfOwnership, highlight: true },
              ].map(card => (
                <div key={card.label} className={`rounded-xl p-4 border ${card.highlight ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {card.raw ? card.value : `${costData.tco!.currency} ${Number(card.value).toFixed(2)}`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Price history chart (CSS bars) */}
          {costData.priceHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Price History</h3>
              <div className="flex items-end gap-3 h-32">
                {(() => {
                  const prices = costData.priceHistory.map(p => p.price);
                  const max = Math.max(...prices, 0.01);
                  return costData.priceHistory.map((p, i) => (
                    <div key={p.id} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {costData.tco?.currency} {p.price.toFixed(2)}
                      </span>
                      <div
                        className={`w-full rounded-t transition-all ${p.isLatest ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        style={{ height: `${Math.max(4, (p.price / max) * 100)}px` }}
                        title={`${costData.tco?.currency} ${p.price.toFixed(2)} — ${new Date(p.recDate).toLocaleDateString()}`}
                      />
                      <span className="text-[10px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
                        {new Date(p.recDate).toLocaleDateString()}
                      </span>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex items-center gap-4 mt-6 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500 inline-block"/>Current version</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600 inline-block"/>Previous versions</span>
              </div>
            </div>
          )}

          {/* 30-day movement chart */}
          {costData.movements.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">30-Day Stock Activity</h3>
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="pb-2 text-left">Date</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {costData.movements.map(m => (
                    <tr key={m.id}>
                      <td className="py-2 text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                      <td className="py-2">
                        <span className={`text-xs font-medium ${m.type === 'IN' ? 'text-green-600' : 'text-amber-600'}`}>{m.type}</span>
                      </td>
                      <td className={`py-2 text-right font-medium ${m.type === 'IN' ? 'text-green-600' : 'text-amber-600'}`}>
                        {m.type === 'IN' ? '+' : '-'}{m.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stock In / Out Modal */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {stockModal === 'in' ? '📦 Receive Stock' : '📤 Issue Stock'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                <input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                  placeholder={stockModal === 'in' ? 'e.g. Purchase order PO-001' : 'e.g. Production order WO-042'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setStockModal(null); setQty(''); setReason(''); }}
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium">
                Cancel
              </button>
              <button onClick={handleStockAction} disabled={submitting || !qty}
                className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${stockModal === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {submitting ? 'Saving…' : stockModal === 'in' ? 'Receive' : 'Issue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
