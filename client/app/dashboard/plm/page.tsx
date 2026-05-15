'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus, Search, Box, Layers, ShoppingCart, FileText,
    Lock, ArrowRight, UserCheck, Clock, CheckCheck,
    RotateCcw, Briefcase, Folder, FolderOpen, FolderPlus,
    Pencil, Trash2, X, ChevronRight, ChevronDown, Database,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface PlmItem {
    id: number; sku: string; name: string; plmType: string;
    lifecycleState: string; revision: string; isLocked: boolean;
    updatedAt: string; folderId?: number | null;
    checkedOutBy?: { id: number; name: string; email: string } | null;
    checkedOutAt?: string | null; vaultFileName?: string | null;
}

interface PlmFolder {
    id: number; name: string; parentId: number | null;
    children: PlmFolder[];
}

const TYPE_META: Record<string, { label: string; Icon: any; color: string }> = {
    P: { label: 'Part',       Icon: Box,         color: 'text-blue-500' },
    A: { label: 'Assembly',   Icon: Layers,       color: 'text-purple-500' },
    C: { label: 'Commercial', Icon: ShoppingCart, color: 'text-amber-500' },
    D: { label: 'Drawing',    Icon: FileText,     color: 'text-green-500' },
};

const STATE_STYLE: Record<string, string> = {
    IN_WORK:      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20',
    UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
    RELEASED:     'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20',
    OBSOLETE:     'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

function timeAgo(d: string) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60)    return `${~~s}s ago`;
    if (s < 3600)  return `${~~(s/60)}m ago`;
    if (s < 86400) return `${~~(s/3600)}h ago`;
    return `${~~(s/86400)}d ago`;
}

// Recursive folder node component
function FolderNode({
    folder, depth, selected, onSelect, onRename, onDelete, expandedIds, toggleExpand,
}: {
    folder: PlmFolder; depth: number; selected: number | null;
    onSelect: (id: number | null) => void;
    onRename: (id: number, name: string) => void;
    onDelete: (id: number) => void;
    expandedIds: Set<number>;
    toggleExpand: (id: number) => void;
}) {
    const isOpen   = expandedIds.has(folder.id);
    const isActive = selected === folder.id;
    const hasChildren = folder.children?.length > 0;

    return (
        <div>
            <div
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isActive
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={{ paddingLeft: `${8 + depth * 16}px` }}
                onClick={() => onSelect(isActive ? null : folder.id)}
            >
                <button
                    onClick={e => { e.stopPropagation(); if (hasChildren) toggleExpand(folder.id); }}
                    className="w-4 h-4 shrink-0 flex items-center justify-center"
                >
                    {hasChildren
                        ? (isOpen ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>)
                        : <span className="w-3"/>}
                </button>
                {isOpen && hasChildren
                    ? <FolderOpen className="w-4 h-4 shrink-0 text-amber-400"/>
                    : <Folder className="w-4 h-4 shrink-0 text-amber-400"/>}
                <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button
                        onClick={e => { e.stopPropagation(); const n = prompt('Rename folder:', folder.name); if (n?.trim()) onRename(folder.id, n.trim()); }}
                        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    ><Pencil className="w-3 h-3"/></button>
                    <button
                        onClick={e => { e.stopPropagation(); if (confirm(`Delete folder "${folder.name}"? Items inside will move to root.`)) onDelete(folder.id); }}
                        className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-500/20 text-red-400"
                    ><Trash2 className="w-3 h-3"/></button>
                </div>
            </div>
            {isOpen && hasChildren && folder.children.map(child => (
                <FolderNode key={child.id} folder={child} depth={depth + 1}
                    selected={selected} onSelect={onSelect}
                    onRename={onRename} onDelete={onDelete}
                    expandedIds={expandedIds} toggleExpand={toggleExpand}
                />
            ))}
        </div>
    );
}

export default function PlmDashboard() {
    const { user } = useAuth();
    const router   = useRouter();

    const [items, setItems]         = useState<PlmItem[]>([]);
    const [workspace, setWorkspace] = useState<PlmItem[]>([]);
    const [folders, setFolders]     = useState<PlmFolder[]>([]);
    const [loading, setLoading]     = useState(true);
    const [wsLoading, setWsLoading] = useState(false);

    const [searchTerm, setSearchTerm]     = useState('');
    const [stateFilter, setStateFilter]   = useState('ALL');
    const [typeFilter, setTypeFilter]     = useState('ALL');
    const [ownerFilter, setOwnerFilter]   = useState('ALL');
    const [revFilter, setRevFilter]       = useState('');
    const [materialFilter, setMaterialFilter] = useState('ALL');
    const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

    const [activeView, setActiveView]     = useState<'ALL' | 'WORKSPACE'>('ALL');
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Folder tree state
    const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
    const [expandedIds, setExpandedIds]     = useState<Set<number>>(new Set());
    const [newFolderName, setNewFolderName] = useState('');
    const [addingFolder, setAddingFolder]   = useState(false);
    const [movingItem, setMovingItem]       = useState<PlmItem | null>(null);

    const toggleExpand = (id: number) => setExpandedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const fetchFolders = useCallback(async () => {
        try { const r = await api.get('/plm/folders'); setFolders(r.data); } catch {}
    }, []);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (stateFilter !== 'ALL') params.lifecycleState = stateFilter;
            if (typeFilter  !== 'ALL') params.plmType        = typeFilter;
            if (ownerFilter === 'ME')  params.ownerId        = String((user as any)?.userId || (user as any)?.id);
            if (revFilter)             params.revision       = revFilter.trim().toUpperCase();
            if (materialFilter !== 'ALL') params.materialId  = materialFilter;
            if (searchTerm)            params.search         = searchTerm;
            const res = await api.get('/plm/items', { params });
            setItems(res.data.items ?? res.data);
        } catch (err) { console.error('PLM fetch failed:', err); }
        finally { setLoading(false); }
    }, [stateFilter, typeFilter, searchTerm, ownerFilter, revFilter, materialFilter, user]);

    const fetchWorkspace = useCallback(async () => {
        setWsLoading(true);
        try { const r = await api.get('/plm/workspace'); setWorkspace(r.data); }
        catch {} finally { setWsLoading(false); }
    }, []);

    const fetchMaterials = useCallback(async () => {
        try { const r = await api.get('/plm/materials'); setAvailableMaterials(r.data.filter((m: any) => m.isActive)); }
        catch {}
    }, []);

    useEffect(() => { fetchItems(); },    [fetchItems]);
    useEffect(() => { fetchFolders(); },  [fetchFolders]);
    useEffect(() => { fetchMaterials(); },[fetchMaterials]);
    useEffect(() => { if (activeView === 'WORKSPACE') fetchWorkspace(); }, [activeView, fetchWorkspace]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await api.post('/plm/folders', { name: newFolderName.trim() });
            setNewFolderName(''); setAddingFolder(false);
            fetchFolders();
        } catch (e: any) { alert(e.response?.data?.error || 'Failed to create folder'); }
    };

    const handleRenameFolder = async (id: number, name: string) => {
        try { await api.patch(`/plm/folders/${id}`, { name }); fetchFolders(); }
        catch (e: any) { alert(e.response?.data?.error || 'Rename failed'); }
    };

    const handleDeleteFolder = async (id: number) => {
        try { await api.delete(`/plm/folders/${id}`); if (selectedFolder === id) setSelectedFolder(null); fetchFolders(); fetchItems(); }
        catch (e: any) { alert(e.response?.data?.error || 'Delete failed'); }
    };

    const handleMoveToFolder = async (itemId: number, folderId: number | null) => {
        try { await api.patch(`/plm/items/${itemId}/folder`, { folderId }); setMovingItem(null); fetchItems(); }
        catch (e: any) { alert(e.response?.data?.error || 'Move failed'); }
    };

    const handleCheckin = async (id: number) => {
        setActionLoading(id);
        try { await api.post(`/plm/items/${id}/checkin`, new FormData(), { headers: { 'Content-Type': 'multipart/form-data' } }); fetchWorkspace(); fetchItems(); }
        catch (err: any) { alert(err.response?.data?.error || 'Check-in failed'); }
        finally { setActionLoading(null); }
    };

    const handleUndoCheckout = async (id: number) => {
        if (!confirm('Discard all changes and return this item to its last checked-in state?')) return;
        setActionLoading(id);
        try { await api.post(`/plm/items/${id}/undo-checkout`); fetchWorkspace(); fetchItems(); }
        catch (err: any) { alert(err.response?.data?.error || 'Undo checkout failed'); }
        finally { setActionLoading(null); }
    };

    // Items filtered by folder selection
    const displayedItems = selectedFolder !== null
        ? items.filter(i => i.folderId === selectedFolder)
        : items;

    // Flatten folder tree for move-to picker
    const flatFolders: PlmFolder[] = [];
    const flattenFolders = (nodes: PlmFolder[]) => nodes.forEach(n => { flatFolders.push(n); if (n.children) flattenFolders(n.children); });
    flattenFolders(folders);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PLM Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Engineering item lifecycle management &amp; revision control</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/plm/templates" className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">Templates</Link>
                    <Link href="/dashboard/plm/new" id="plm-new-item-btn" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
                        <Plus className="w-4 h-4"/>New PLM Item
                    </Link>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
                {(['ALL', 'WORKSPACE'] as const).map(v => (
                    <button key={v} onClick={() => setActiveView(v)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeView===v?'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm':'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        {v === 'ALL' ? <Briefcase className="w-4 h-4"/> : <UserCheck className="w-4 h-4"/>}
                        {v === 'ALL' ? 'All Items' : 'My Workspace'}
                        {v === 'WORKSPACE' && workspace.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">{workspace.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ─── MY WORKSPACE VIEW ──────────────────────────────────────────── */}
            {activeView === 'WORKSPACE' && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                        <UserCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">My Workspace</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Items checked out to you. Locked for all other users until you check in.</p>
                        </div>
                    </div>
                    {wsLoading ? (
                        <div className="text-center py-12 text-gray-400">Loading workspace…</div>
                    ) : workspace.length === 0 ? (
                        <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <UserCheck className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4"/>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No items checked out</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Check out an IN WORK item to start editing.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {workspace.map(item => {
                                const meta = TYPE_META[item.plmType] || TYPE_META['P'];
                                const Icon = meta.Icon;
                                const busy = actionLoading === item.id;
                                return (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <Icon className={`w-5 h-5 ${meta.color}`}/>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-gray-900 dark:text-white">{item.sku}</span>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${STATE_STYLE[item.lifecycleState]||''}`}>{item.lifecycleState.replace('_',' ')}</span>
                                                    {item.vaultFileName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-medium">vault ✓</span>}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{item.name}</p>
                                                {item.checkedOutAt && <p className="flex items-center gap-1 text-xs text-gray-400 mt-1"><Clock className="w-3 h-3"/>Checked out {timeAgo(item.checkedOutAt)}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link href={`/dashboard/plm/${item.id}`} className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">Open</Link>
                                            <button onClick={() => handleCheckin(item.id)} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors">
                                                <CheckCheck className="w-3.5 h-3.5"/>Check In
                                            </button>
                                            <button onClick={() => handleUndoCheckout(item.id)} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
                                                <RotateCcw className="w-3.5 h-3.5"/>Undo
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ─── ALL ITEMS VIEW with Folder Sidebar ─────────────────────────── */}
            {activeView === 'ALL' && (
                <div className="flex gap-4 items-start">
                    {/* Folder Tree Sidebar */}
                    <div className="w-56 shrink-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 space-y-1 sticky top-6">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Folders</span>
                            <button onClick={() => setAddingFolder(true)} className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="New folder">
                                <FolderPlus className="w-4 h-4"/>
                            </button>
                        </div>

                        {/* All Items (root) */}
                        <button
                            onClick={() => setSelectedFolder(null)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedFolder === null ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                            <Database className="w-4 h-4 text-gray-400 shrink-0"/>
                            <span className="truncate">All Items</span>
                            <span className="ml-auto text-[10px] text-gray-400">{items.length}</span>
                        </button>

                        {/* Folder tree */}
                        {folders.map(f => (
                            <FolderNode key={f.id} folder={f} depth={0}
                                selected={selectedFolder} onSelect={setSelectedFolder}
                                onRename={handleRenameFolder} onDelete={handleDeleteFolder}
                                expandedIds={expandedIds} toggleExpand={toggleExpand}
                            />
                        ))}

                        {/* New folder input */}
                        {addingFolder && (
                            <div className="pt-1 space-y-1.5">
                                <input
                                    autoFocus
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName(''); } }}
                                    placeholder="Folder name…"
                                    className="w-full px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
                                />
                                <div className="flex gap-1">
                                    <button onClick={handleCreateFolder} className="flex-1 py-1 text-[10px] font-bold bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                                    <button onClick={() => { setAddingFolder(false); setNewFolderName(''); }} className="flex-1 py-1 text-[10px] font-bold border border-gray-200 dark:border-gray-700 text-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                                </div>
                            </div>
                        )}

                        {folders.length === 0 && !addingFolder && (
                            <p className="text-[11px] text-gray-400 italic px-2 pt-1">No folders yet. Click + to create one.</p>
                        )}
                    </div>

                    {/* Main table */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        {/* Folder breadcrumb */}
                        {selectedFolder !== null && (
                            <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                                <Folder className="w-4 h-4 text-amber-400"/>
                                <span className="font-medium">{flatFolders.find(f => f.id === selectedFolder)?.name}</span>
                                <span className="text-amber-400">·</span>
                                <span className="text-amber-500">{displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}</span>
                                <button onClick={() => setSelectedFolder(null)} className="ml-auto text-amber-400 hover:text-amber-600"><X className="w-4 h-4"/></button>
                            </div>
                        )}

                        {/* Filters */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                                <input type="text" placeholder="Search by part number or name…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm"/>
                            </div>
                            <div className="flex gap-2 flex-wrap items-center">
                                {[
                                    { value: stateFilter, onChange: (v: string) => setStateFilter(v), options: [['ALL','All States'],['IN_WORK','In Work'],['UNDER_REVIEW','Under Review'],['RELEASED','Released'],['OBSOLETE','Obsolete']] },
                                    { value: typeFilter,  onChange: (v: string) => setTypeFilter(v),  options: [['ALL','All Types'],['P','Part'],['A','Assembly'],['C','Commercial'],['D','Drawing']] },
                                    { value: ownerFilter, onChange: (v: string) => setOwnerFilter(v), options: [['ALL','All Owners'],['ME','My Items']] },
                                ].map((sel, i) => (
                                    <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value)}
                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-none">
                                        {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                ))}
                                <select value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium focus:outline-none max-w-[140px]">
                                    <option value="ALL">All Materials</option>
                                    {availableMaterials.map(m => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
                                </select>
                                <input type="text" placeholder="Rev (A)" value={revFilter} onChange={e => setRevFilter(e.target.value)}
                                    className="w-20 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-xs font-medium uppercase"/>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Part Number</th>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Description</th>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Rev</th>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">State</th>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Checkout</th>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Vault</th>
                                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading…</td></tr>
                                    ) : displayedItems.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-16 text-center">
                                            <Box className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
                                            <p className="text-gray-500 dark:text-gray-400">{selectedFolder !== null ? 'No items in this folder.' : 'No PLM items found.'}</p>
                                        </td></tr>
                                    ) : displayedItems.map(item => {
                                        const meta = TYPE_META[item.plmType] || TYPE_META['P'];
                                        const Icon = meta.Icon;
                                        return (
                                            <tr key={item.id} onClick={() => router.push(`/dashboard/plm/${item.id}`)} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group cursor-pointer">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                                                            <Icon className={`w-4 h-4 ${meta.color}`}/>
                                                        </div>
                                                        <div>
                                                            <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{item.sku}</span>
                                                            <p className="text-[10px] text-gray-400 uppercase">{meta.label}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[180px] truncate">{item.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{item.revision}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${STATE_STYLE[item.lifecycleState]||''}`}>
                                                        {item.isLocked && <Lock className="w-2.5 h-2.5"/>}
                                                        {item.lifecycleState.replace('_',' ')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.checkedOutBy ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0"/>
                                                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[90px]">{item.checkedOutBy.name || item.checkedOutBy.email}</span>
                                                        </div>
                                                    ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {item.vaultFileName
                                                        ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 font-medium">Stored</span>
                                                        : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setMovingItem(item); }}
                                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors"
                                                            title="Move to folder"
                                                        ><Folder className="w-3.5 h-3.5"/></button>
                                                        <Link href={`/dashboard/plm/${item.id}`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                            Open <ArrowRight className="w-3.5 h-3.5"/>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Move to Folder Modal */}
            {movingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">Move to Folder</h2>
                            <button onClick={() => setMovingItem(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4"/></button>
                        </div>
                        <p className="text-sm text-gray-500">Moving <span className="font-mono font-bold text-gray-900 dark:text-white">{movingItem.sku}</span></p>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                            <button onClick={() => handleMoveToFolder(movingItem.id, null)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${movingItem.folderId === null ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <Database className="w-4 h-4 text-gray-400"/>Root (no folder)
                            </button>
                            {flatFolders.map(f => (
                                <button key={f.id} onClick={() => handleMoveToFolder(movingItem.id, f.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${movingItem.folderId === f.id ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    <Folder className="w-4 h-4 text-amber-400 shrink-0"/>{f.name}
                                </button>
                            ))}
                            {flatFolders.length === 0 && <p className="text-sm text-gray-400 italic py-2 text-center">No folders yet. Create one first.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
