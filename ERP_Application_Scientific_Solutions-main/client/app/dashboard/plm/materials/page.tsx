'use client';
import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, FlaskConical, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';

interface Material {
  id: number; name: string; colour?: string; texture?: string;
  density?: number; standard?: string; isActive: boolean; createdAt: string;
}

const EMPTY: Omit<Material,'id'|'createdAt'> = { name:'', colour:'', texture:'', density: undefined, standard:'', isActive: true };

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]   = useState<typeof EMPTY>({...EMPTY});
  const [editing, setEditing] = useState<number|null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);

  const load = () =>
    api.get('/plm/materials').then(r => setMaterials(r.data)).catch(console.error).finally(()=>setLoading(false));

  useEffect(()=>{ load(); },[]);

  const openNew = () => { setForm({...EMPTY}); setEditing(null); setShowForm(true); };
  const openEdit = (m: Material) => {
    setForm({ name:m.name, colour:m.colour||'', texture:m.texture||'', density:m.density??undefined, standard:m.standard||'', isActive:m.isActive });
    setEditing(m.id); setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/plm/materials/${editing}`, form);
      } else {
        await api.post('/plm/materials', form);
      }
      await load();
      setShowForm(false); setEditing(null);
    } catch (e:any) { alert(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this material? Items using it will keep the reference until changed.')) return;
    try { await api.delete(`/plm/materials/${id}`); await load(); }
    catch (e:any) { alert(e.response?.data?.error || 'Delete failed'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/plm" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500"/>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-500"/>Material Library
            </h1>
            <p className="text-sm text-gray-500">Admin-managed materials — selectable on PLM items, written to Creo MATERIAL parameter</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4"/>Add Material
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-5">
            {editing ? 'Edit Material' : 'New Material'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                placeholder="e.g. Stainless Steel 316L"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Standard</label>
              <input value={form.standard} onChange={e=>setForm(f=>({...f,standard:e.target.value}))}
                placeholder="e.g. ASTM A276, EN 10088"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Texture</label>
              <input value={form.texture} onChange={e=>setForm(f=>({...f,texture:e.target.value}))}
                placeholder="e.g. Brushed, Polished, Raw"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Density (g/cm³)</label>
              <input type="number" step="0.001" value={form.density??''} onChange={e=>setForm(f=>({...f,density:e.target.value?parseFloat(e.target.value):undefined}))}
                placeholder="e.g. 7.98"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Colour</label>
              <div className="flex gap-2">
                <input type="color" value={form.colour||'#cccccc'} onChange={e=>setForm(f=>({...f,colour:e.target.value}))}
                  className="w-10 h-9 rounded border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent"/>
                <input value={form.colour} onChange={e=>setForm(f=>({...f,colour:e.target.value}))}
                  placeholder="#C0C0C0 or Silver"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={e=>setForm(f=>({...f,isActive:e.target.checked}))}
                className="w-4 h-4 text-blue-600 rounded"/>
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">Active (visible in selector)</label>
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              <Save className="w-4 h-4"/>{saving ? 'Saving…' : 'Save Material'}
            </button>
            <button onClick={()=>setShowForm(false)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4"/>Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 text-xs">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Standard</th>
                <th className="px-5 py-3 font-medium">Texture</th>
                <th className="px-5 py-3 font-medium">Density</th>
                <th className="px-5 py-3 font-medium">Colour</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {loading && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Loading…</td></tr>}
              {!loading && materials.length===0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400 italic">No materials yet. Click "Add Material" to create the first one.</td></tr>
              )}
              {materials.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-5 py-4 text-gray-500">{m.standard || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-5 py-4 text-gray-500">{m.texture || <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-5 py-4 text-gray-500 font-mono">{m.density != null ? `${m.density} g/cm³` : <span className="italic text-gray-300 dark:text-gray-600">—</span>}</td>
                  <td className="px-5 py-4">
                    {m.colour ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-gray-200 dark:border-gray-700 shrink-0" style={{backgroundColor: m.colour}}/>
                        <span className="text-gray-500 font-mono text-xs">{m.colour}</span>
                      </div>
                    ) : <span className="italic text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${m.isActive ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/20' : 'text-gray-400 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                      {m.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={()=>openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={()=>remove(m.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
