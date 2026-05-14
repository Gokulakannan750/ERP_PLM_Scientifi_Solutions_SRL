'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import {ArrowLeft,Plus,Pencil,Trash2,Save,X,FolderOpen,CheckCircle} from 'lucide-react';
import api from '@/lib/api';

interface Tpl {id:number;itemType:string;name:string;filePath:string|null;fileExt:string|null;description:string|null;isActive:boolean;updatedAt:string}
const TYPES=['P','A','C','D'];
const TYPE_LABEL:Record<string,string>={P:'Part (.prt)',A:'Assembly (.asm)',C:'Commercial (.prt)',D:'Drawing (.drw)'};
const EXT:Record<string,string>={P:'.prt',A:'.asm',C:'.prt',D:'.drw'};

const empty=(type: string = 'P'): Omit<Tpl, 'id' | 'updatedAt'> => ({itemType:type,name:'',filePath:'',fileExt:EXT[type]||'.prt',description:'',isActive:true});

export default function PlmTemplatesPage(){
  const [templates,setTemplates]=useState<Tpl[]>([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState<Partial<Tpl>|null>(null);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const load=async()=>{setLoading(true);try{const r=await api.get('/plm/templates');setTemplates(r.data);}catch(e){console.error(e);}finally{setLoading(false);};};
  useEffect(()=>{load();},[]);

  const save=async()=>{
    if(!editing?.name?.trim()||!editing?.itemType){setError('Name and type are required.');return;}
    setSaving(true);setError('');
    try{
      if(editing.id){await api.put(`/plm/templates/${editing.id}`,editing);}
      else{await api.post('/plm/templates',editing);}
      setEditing(null);await load();
    }catch(e:any){setError(e.response?.data?.error||'Save failed');}
    finally{setSaving(false);}
  };

  const del=async(id:number)=>{
    if(!confirm('Delete this template?'))return;
    try{await api.delete(`/plm/templates/${id}`);await load();}
    catch(e:any){alert(e.response?.data?.error||'Delete failed');}
  };

  return(
    <div className="max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard/plm" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4"/>Back to PLM Dashboard
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">PLM Templates</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage Creo template files for each item type.</p>
        </div>
        <button onClick={()=>setEditing(empty())} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4"/>Add Template
        </button>
      </div>

      {/* Info box */}
      <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">Template Storage &amp; Management</p>
        <p className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
          Template files (.prt, .asm, .drw) are stored on the shared network drive. Set the file path to the network location. Only one template per type can be active at a time — activating a new one deactivates the previous.
        </p>
      </div>

      {/* Edit / Create form */}
      {editing&&(
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-blue-200 dark:border-blue-500/30 p-6 space-y-4 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-white">{editing.id?'Edit Template':'New Template'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Item Type *</label>
              <select value={editing.itemType||'P'} onChange={e=>setEditing(p=>({...p,itemType:e.target.value,fileExt:EXT[e.target.value]||'.prt'}))} className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                {TYPES.map(t=><option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Template Name *</label>
              <input value={editing.name||''} onChange={e=>setEditing(p=>({...p,name:e.target.value}))} placeholder="e.g. Standard Part Template" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500">Network File Path</label>
              <div className="relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                <input value={editing.filePath||''} onChange={e=>setEditing(p=>({...p,filePath:e.target.value}))} placeholder={`e.g. \\\\server\\templates\\start${EXT[editing.itemType||'P']}`} className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-gray-500">Description</label>
              <textarea value={editing.description||''} onChange={e=>setEditing(p=>({...p,description:e.target.value}))} rows={2} placeholder="Optional notes…" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"/>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="tpl-active" checked={!!editing.isActive} onChange={e=>setEditing(p=>({...p,isActive:e.target.checked}))} className="w-4 h-4 rounded border-gray-300"/>
              <label htmlFor="tpl-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">Set as active template for this type</label>
            </div>
          </div>
          {error&&<p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <Save className="w-4 h-4"/>{saving?'Saving…':'Save Template'}
            </button>
            <button onClick={()=>{setEditing(null);setError('');}} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <X className="w-4 h-4"/>Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        {loading?(
          <div className="p-12 text-center text-gray-400">Loading templates…</div>
        ):templates.length===0?(
          <div className="p-12 text-center">
            <FolderOpen className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No templates configured yet.</p>
          </div>
        ):(
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs">
              <tr>
                <th className="px-5 py-3 font-medium uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 font-medium uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 font-medium uppercase tracking-wider">File Path</th>
                <th className="px-5 py-3 font-medium uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 font-medium uppercase tracking-wider">Updated</th>
                <th className="px-5 py-3 font-medium uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {templates.map(t=>(
                <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                      {TYPE_LABEL[t.itemType]||t.itemType}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{t.name}</td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{t.filePath||'—'}</td>
                  <td className="px-5 py-4">
                    {t.isActive?(
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                        <CheckCircle className="w-3.5 h-3.5"/>Active
                      </span>
                    ):(
                      <span className="text-xs text-gray-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">{new Date(t.updatedAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={()=>setEditing({...t})} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4"/>
                      </button>
                      <button onClick={()=>del(t.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
