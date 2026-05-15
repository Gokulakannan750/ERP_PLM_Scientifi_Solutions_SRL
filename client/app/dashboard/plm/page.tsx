'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus, Search, Box, Layers, ShoppingCart, FileText,
    Lock, ArrowRight, UserCheck, Clock, CheckCheck,
    RotateCcw, Briefcase
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface PlmItem {
    id: number;
    sku: string;
    name: string;
    plmType: string;
    lifecycleState: string;
    revision: string;
    isLocked: boolean;
    updatedAt: string;
    checkedOutBy?: { id: number; name: string; email: string } | null;
    checkedOutAt?: string | null;
}

const TYPE_META: Record<string, { label: string; Icon: any; color: string }> = {
    P: { label: 'Part',       Icon: Box,          color: 'text-blue-500' },
    A: { label: 'Assembly',   Icon: Layers,        color: 'text-purple-500' },
    C: { label: 'Commercial', Icon: ShoppingCart,  color: 'text-amber-500' },
    D: { label: 'Drawing',    Icon: FileText,      color: 'text-green-500' },
};

const STATE_STYLE: Record<string, string> = {
    IN_WORK:      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    RELEASED:     'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20',
    OBSOLETE:     'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function PlmDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems]         = useState<PlmItem[]>([]);
    const [workspace, setWorkspace] = useState<PlmItem[]>([]);
    const [loading, setLoading]     = useState(true);
    const [wsLoading, setWsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('ALL');
    const [typeFilter, setTypeFilter]   = useState('ALL');
    const [ownerFilter, setOwnerFilter] = useState('ALL'); // 'ALL' or 'ME'
    const [revFilter, setRevFilter]     = useState('');
    const [materialFilter, setMaterialFilter] = useState('ALL');
    const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

    const [activeView, setActiveView]   = useState<'ALL' | 'WORKSPACE'>('ALL');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (stateFilter !== 'ALL') params.lifecycleState = stateFilter;
            if (typeFilter  !== 'ALL') params.plmType        = typeFilter;
            if (ownerFilter === 'ME')  params.ownerId        = String((user as any)?.userId || user?.id);
            if (revFilter)             params.revision       = revFilter.trim().toUpperCase();
            if (materialFilter !== 'ALL') params.materialId  = materialFilter;
            if (searchTerm)            params.search         = searchTerm;
            const res = await api.get('/plm/items', { params });
            setItems(res.data.items ?? res.data);
        } catch (err) {
            console.error('PLM fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [stateFilter, typeFilter, searchTerm, ownerFilter, revFilter, materialFilter, user]);

    const fetchWorkspace = useCallback(async () => {
        setWsLoading(true);
        try {
            const res = await api.get('/plm/workspace');
            setWorkspace(res.data);
        } catch (err) {
            console.error('Workspace fetch failed:', err);
        } finally {
            setWsLoading(false);
        }
    }, []);

    const fetchMaterials = useCallback(async () => {
        try {
            const res = await api.get('/plm/materials');
            setAvailableMaterials(res.data.filter((m: any) => m.isActive));
        } catch (err) {
            console.error('Materials fetch failed:', err);
        }
    }, []);

    useEffect(() => { fetchItems(); }, [fetchItems]);
    useEffect(() => { if (activeView === 'WORKSPACE') fetchWorkspace(); }, [activeView, fetchWorkspace]);
    useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

    const handleCheckin = async (id: number) => {
        setActionLoading(id);
        try {
            await api.post(`/plm/items/${id}/checkin`);
            fetchWorkspace();
            fetchItems();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Check-in failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUndoCheckout = async (id: number) => {
        if (!confirm('Discard all changes and return this item to its last checked-in state?')) return;
        setActionLoading(id);
        try {
            await api.post(`/plm/items/${id}/undo-checkout`);
            fetchWorkspace();
            fetchItems();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Undo checkout failed');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PLM Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Engineering item lifecycle management &amp; revision control
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/dashboard/plm/templates"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                    >
                        Templates
                    </Link>
                    <Link
                        href="/dashboard/plm/new"
                        id="plm-new-item-btn"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        New PLM Item
                    </Link>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                <button
                    onClick={() => setActiveView('ALL')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeView === 'ALL'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <Briefcase className="w-4 h-4" />
                    All Items
                </button>
                <button
                    onClick={() => setActiveView('WORKSPACE')}
                    id="plm-workspace-tab"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeView === 'WORKSPACE'
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    My Workspace
                    {workspace.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                            {workspace.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── MY WORKSPACE VIEW ─────────────────────────────────────────── */}
            {activeView === 'WORKSPACE' && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                        <UserCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">My Workspace View</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                Items currently checked out to you. They are locked for all other users (read-only) until you check them in.
                            </p>
                        </div>
                    </div>

                    {wsLoading ? (
                        <div className="text-center py-12 text-gray-400">Loading workspace…</div>
                    ) : workspace.length === 0 ? (
                        <div className="py-16 text-center bg-card-bg dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <UserCheck className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No items checked out</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Check out an <span className="font-medium">IN WORK</span> item from the All Items view to start editing.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {workspace.map(item => {
                                const meta = TYPE_META[item.plmType] || TYPE_META['P'];
                                const Icon = meta.Icon;
                                const busy = actionLoading === item.id;
                                return (
                                    <div
                                        key={item.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-card-bg dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center`}>
                                                <Icon className={`w-5 h-5 ${meta.color}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{item.sku}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATE_STYLE[item.lifecycleState] || ''}`}>
                                                        {item.lifecycleState.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{item.name}</p>
                                                {item.checkedOutAt && (
                                                    <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                        <Clock className="w-3 h-3" />
                                                        Checked out {timeAgo(item.checkedOutAt)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                href={`/dashboard/plm/${item.id}`}
                                                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                            >
                                                Open
                                            </Link>
                                            <button
                                                onClick={() => handleCheckin(item.id)}
                                                disabled={busy}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" />
                                                Check In
                                            </button>
                                            <button
                                                onClick={() => handleUndoCheckout(item.id)}
                                                disabled={busy}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Undo
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── ALL ITEMS VIEW ─────────────────────────────────────────────── */}
            {activeView === 'ALL' && (
                <div className="bg-card-bg dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by part number or name…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap items-center mt-3 sm:mt-0">
                            {/* State filter */}
                            <select
                                value={stateFilter}
                                onChange={e => setStateFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="ALL">All States</option>
                                <option value="IN_WORK">In Work</option>
                                <option value="UNDER_REVIEW">Under Review</option>
                                <option value="RELEASED">Released</option>
                                <option value="OBSOLETE">Obsolete</option>
                            </select>

                            {/* Type filter */}
                            <select
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="ALL">All Types</option>
                                <option value="P">Part</option>
                                <option value="A">Assembly</option>
                                <option value="C">Commercial</option>
                                <option value="D">Drawing</option>
                            </select>

                            {/* Owner filter */}
                            <select
                                value={ownerFilter}
                                onChange={e => setOwnerFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="ALL">All Owners</option>
                                <option value="ME">My Items</option>
                            </select>

                            {/* Material filter */}
                            <select
                                value={materialFilter}
                                onChange={e => setMaterialFilter(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[150px]"
                            >
                                <option value="ALL">All Materials</option>
                                {availableMaterials.map(m => (
                                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                                ))}
                            </select>

                            {/* Revision filter */}
                            <input
                                type="text"
                                placeholder="Rev (e.g. A)"
                                value={revFilter}
                                onChange={e => setRevFilter(e.target.value)}
                                className="w-20 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium uppercase"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Part Number</th>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Rev</th>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">State</th>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Checkout</th>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider">Modified</th>
                                    <th className="px-6 py-4 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading…</td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center">
                                            <Box className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400">No PLM items found.</p>
                                        </td>
                                    </tr>
                                ) : items.map(item => {
                                    const meta = TYPE_META[item.plmType] || TYPE_META['P'];
                                    const Icon = meta.Icon;
                                    return (
                                        <tr key={item.id} onClick={() => router.push(`/dashboard/plm/${item.id}`)} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                        <Icon className={`w-4 h-4 ${meta.color}`} />
                                                    </div>
                                                    <div>
                                                        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{item.sku}</span>
                                                        <p className="text-[10px] text-gray-400 uppercase">{meta.label}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                                                    {item.revision}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATE_STYLE[item.lifecycleState] || ''}`}>
                                                    {item.isLocked && <Lock className="w-3 h-3" />}
                                                    {item.lifecycleState.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.checkedOutBy ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                                                            <UserCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                                                            {item.checkedOutBy.name || item.checkedOutBy.email}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-400">
                                                    {new Date(item.updatedAt).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/dashboard/plm/${item.id}`}
                                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Open
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
