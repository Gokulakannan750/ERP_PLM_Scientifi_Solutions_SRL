/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import {useState,useEffect,use,useCallback} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,Lock,Unlock,RefreshCw,History,Layers,CheckCircle,FileText,Download,Plus,Trash2,UserCheck,RotateCcw,CheckCheck,Clock,AlertTriangle,X,Save,ExternalLink,Zap} from 'lucide-react';
import api from '@/lib/api';
import {useAuth} from '@/contexts/AuthContext';
import creoService from '@/lib/creoService';

interface User {id:number;name:string;email:string}
interface PlmItem {id:number;sku:string;name:string;description:string;plmType:string;lifecycleState:string;revision:string;isLocked:boolean;itemNumber:string;parentId?:number;updatedAt:string;modifiedByUserId?:number;modifiedBy?:User|null;checkedOutBy?:User|null;checkedOutAt?:string|null;checkoutNote?:string|null;materialId?:number|null;material?:{id:number;name:string}|null;plmItemLink?:string|null}
interface BomRow {id:number;child:PlmItem;quantity:number}

const STATE_STYLE:Record<string,string>={IN_WORK:'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/20',UNDER_REVIEW:'text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20',RELEASED:'text-green-600 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-500/10 dark:border-green-500/20',OBSOLETE:'text-gray-500 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700'};

function timeAgo(d:string){const s=(Date.now()-new Date(d).getTime())/1000;if(s<60)return`${~~s}s ago`;if(s<3600)return`${~~(s/60)}m ago`;if(s<86400)return`${~~(s/3600)}h ago`;return`${~~(s/86400)}d ago`;}

export default function PlmItemDetail({params}:{params:Promise<{id:string}>}){
  const {id}=use(params);
  const router=useRouter();
  const {user}=useAuth();
  const [item,setItem]=useState<PlmItem|null>(null);
  const [bom,setBom]=useState<BomRow[]>([]);
  const [history,setHistory]=useState<PlmItem[]>([]);
  const [allItems,setAllItems]=useState<PlmItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('OVERVIEW');
  const [actionLoading,setActionLoading]=useState('');
  const [bomEditing,setBomEditing]=useState(false);
  const [draftBom,setDraftBom]=useState<{childId:string;quantity:string}[]>([]);
  const [bomSearch,setBomSearch]=useState('');
  const [creoAvailable,setCreoAvailable]=useState(false);
  const [creoStatus,setCreoStatus]=useState('');
  const [auditLogs,setAuditLogs]=useState<any[]>([]);
  const [files,setFiles]=useState<any[]>([]);
  const [uploading,setUploading]=useState(false);
  const [bomTree,setBomTree]=useState<any[]>([]);
  const [bomView,setBomView]=useState<'flat'|'tree'>('tree');
  const [availableMaterials,setAvailableMaterials]=useState<any[]>([]);

  const load=useCallback(async()=>{
    try{
      const [iRes,bRes,hRes,mRes]=await Promise.all([
        api.get(`/inventory/${id}`),
        api.get(`/plm/items/${id}/bom`),
        api.get(`/inventory/${id}/versions`),
        api.get('/plm/materials'),
      ]);
      setItem(iRes.data);setBom(bRes.data);setHistory(hRes.data);
      setAvailableMaterials(mRes.data.filter((m:any)=>m.isActive));
    }catch(e){console.error(e);}finally{setLoading(false);}
  },[id]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    creoService.isCreoAvailable().then(setCreoAvailable);
  },[]);
  useEffect(()=>{
    if(bomEditing&&allItems.length===0){
      api.get('/plm/items').then(r=>setAllItems(r.data.items??r.data)).catch(()=>{});
    }
  },[bomEditing, allItems.length]);
  useEffect(()=>{
    if(tab==='AUDIT'){
      api.get(`/plm/items/${id}/audit`).then(r=>setAuditLogs(r.data)).catch(()=>{});
    }
    if(tab==='FILES'){
      api.get(`/plm/items/${id}/files`).then(r=>setFiles(r.data)).catch(()=>{});
    }
    if(tab==='BOM'){
      api.get(`/plm/items/${id}/bom/tree`).then(r=>setBomTree(r.data)).catch(()=>{});
    }
  },[tab,id]);

  // CSV export via anchor element
  const handleCsvExport=()=>{
    const token=typeof window!=='undefined'?localStorage.getItem('token'):null;
    const url=`${process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api'}/plm/items/${id}/bom/export`;
    const a=document.createElement('a');
    a.href=url;
    a.setAttribute('download','');
    // Pass token via query for this download (server reads it)
    fetch(url,{headers:{Authorization:`Bearer ${token}`}})
      .then(r=>r.blob()).then(blob=>{
        const burl=URL.createObjectURL(blob);
        a.href=burl;a.click();URL.revokeObjectURL(burl);
      });
  };

  const act=async(fn:()=>Promise<any>,key:string)=>{
    setActionLoading(key);
    try{await fn();await load();}
    catch(e:any){alert(e.response?.data?.error||'Action failed');}
    finally{setActionLoading('');}
  };

  const handleTransition=(nextState:string)=>act(async()=>{
    await api.patch(`/plm/items/${id}/state`,{nextState});
    if (nextState === 'RELEASED' && creoAvailable && item?.plmItemLink) {
      setCreoStatus('Generating Auto-Export files (STEP/PDF)…');
      try {
        if (item.plmType === 'P' || item.plmType === 'A') {
          const stepRes = await creoService.exportSTEP(item.plmItemLink);
          if (stepRes.success && stepRes.filePath) {
            await api.post(`/plm/items/${id}/files/import`, { sourcePath: stepRes.filePath });
          }
        } else if (item.plmType === 'D') {
          const pdfRes = await creoService.exportPDF(item.plmItemLink);
          if (pdfRes.success && pdfRes.filePath) {
            await api.post(`/plm/items/${id}/files/import`, { sourcePath: pdfRes.filePath });
          }
        }
        setCreoStatus('Auto-exports complete ✓');
      } catch(e) {
        setCreoStatus('Auto-export failed.');
      }
    }
  },nextState);
  const handleCheckout=()=>act(()=>api.post(`/plm/items/${id}/checkout`),'checkout');
  const handleCheckin=()=>act(async()=>{
    // 1. Call ERP check-in API
    await api.post(`/plm/items/${id}/checkin`);
    // 2. If Creo is available and item has a file path, sync params → model
    if(creoAvailable&&item?.plmItemLink){
      setCreoStatus('Syncing parameters to Creo model…');
      try{
        await creoService.syncParamsToCreo(item.plmItemLink,{
          PART_NUMBER: item.sku,
          DESCRIPTION: item.name,
          REVISION: item.revision,
          PTC_MATERIAL_NAME: item.material?.name || '',
        });
        setCreoStatus('Parameters synced to Creo ✓');
      }catch(e){
        setCreoStatus('Check-in done. Creo param sync failed (Creo may not be open).');
      }
    }
  },'checkin');
  const handleUndo=()=>{if(!confirm('Discard changes and return to last checked-in state?'))return;act(()=>api.post(`/plm/items/${id}/undo-checkout`),'undo');};
  const handleRevise=()=>{if(!confirm('Create new revision (B, C…)? Current Released version will be locked.'))return;act(async()=>{const r=await api.post(`/plm/items/${id}/revise`);router.push(`/dashboard/plm/${r.data.id}`);},'revise');};
  const handleMaterialChange=(e:any)=>act(()=>api.patch(`/plm/items/${id}/material`,{materialId:e.target.value||null}),'material');

  const startBomEdit=()=>{setDraftBom(bom.map(b=>({childId:String(b.child.id),quantity:String(b.quantity)})));setBomEditing(true);};
  const saveBom=()=>act(async()=>{const r=await api.post(`/plm/items/${id}/bom`,{components:draftBom.filter(r=>r.childId).map(r=>({childId:r.childId,quantity:r.quantity||'1'}))});setBom(r.data);setBomEditing(false);},'bom');

  const isMyCheckout=item?.checkedOutBy?.id===user?.id;
  const isCheckedOut=!!item?.checkedOutBy;
  const isAdmin=(user as any)?.role==='ADMIN';
  const isOwner=item?.modifiedByUserId===user?.id;

  if(loading||!item)return <div className="p-8 text-gray-500">Loading…</div>;

  const filteredItems=allItems.filter(i=>i.id!==item.id&&(i.sku.toLowerCase().includes(bomSearch.toLowerCase())||i.name.toLowerCase().includes(bomSearch.toLowerCase())));

  return(
    <div className="space-y-6">
      <button onClick={()=>router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4"/>Back to PLM
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${item.isLocked?'border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10':'border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10'}`}>
            {item.isLocked?<Lock className="w-6 h-6 text-green-500"/>:<Unlock className="w-6 h-6 text-blue-500"/>}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">{item.sku}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATE_STYLE[item.lifecycleState]||''}`}>{item.lifecycleState.replace('_',' ')}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-0.5">{item.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Checkout controls */}
          {item.lifecycleState==='IN_WORK'&&!isCheckedOut&&(
            <button onClick={handleCheckout} disabled={actionLoading==='checkout'} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <UserCheck className="w-4 h-4"/>{actionLoading==='checkout'?'Checking out…':'Check Out'}
            </button>
          )}
          {isMyCheckout&&(
            <>
              <button onClick={handleCheckin} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                <CheckCheck className="w-4 h-4"/>{actionLoading==='checkin'?'Checking in…':'Check In'}
              </button>
              <button onClick={handleUndo} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors">
                <RotateCcw className="w-4 h-4"/>Undo Checkout
              </button>
            </>
          )}
          {/* Lifecycle transitions — role-gated per spec */}
          {/* IN_WORK → UNDER_REVIEW: item owner only */}
          {item.lifecycleState==='IN_WORK'&&!isCheckedOut&&(isOwner||isAdmin)&&(
            <button onClick={()=>handleTransition('UNDER_REVIEW')} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <CheckCircle className="w-4 h-4"/>Submit for Review
            </button>
          )}
          {/* UNDER_REVIEW → RELEASED: ADMIN only */}
          {item.lifecycleState==='UNDER_REVIEW'&&isAdmin&&(
            <button onClick={()=>handleTransition('RELEASED')} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <CheckCircle className="w-4 h-4"/>Approve &amp; Release
            </button>
          )}
          {/* ANY → OBSOLETE: ADMIN only */}
          {item.lifecycleState!=='OBSOLETE'&&isAdmin&&(
            <button onClick={()=>{if(confirm('Mark this item as Obsolete? It will be flagged and removed from active BOM resolution.'))handleTransition('OBSOLETE');}} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <AlertTriangle className="w-4 h-4"/>Mark Obsolete
            </button>
          )}
          {/* RELEASED → new revision: ADMIN or owner */}
          {item.lifecycleState==='RELEASED'&&(isOwner||isAdmin)&&(
            <button onClick={handleRevise} disabled={!!actionLoading} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
              <RefreshCw className="w-4 h-4"/>New Revision
            </button>
          )}
        </div>
      </div>

      {/* Checkout banner */}
      {isCheckedOut&&(
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${isMyCheckout?'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20':'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'}`}>
          <UserCheck className={`w-5 h-5 shrink-0 mt-0.5 ${isMyCheckout?'text-blue-500':'text-amber-500'}`}/>
          <div>
            <p className={`text-sm font-semibold ${isMyCheckout?'text-blue-800 dark:text-blue-300':'text-amber-800 dark:text-amber-300'}`}>
              {isMyCheckout?'Checked out to you':'Checked out'}
            </p>
            <p className={`text-xs mt-0.5 ${isMyCheckout?'text-blue-600 dark:text-blue-400':'text-amber-600 dark:text-amber-400'}`}>
              {item.checkedOutBy?.name||item.checkedOutBy?.email}{item.checkedOutAt&&` · ${timeAgo(item.checkedOutAt)}`}
              {!isMyCheckout&&' · This item is read-only for you.'}
            </p>
          </div>
        </div>
      )}

      {/* Creo Status Banner */}
      {creoStatus && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 text-sm font-medium">
          <Zap className="w-4 h-4 text-blue-500 animate-pulse" />
          {creoStatus}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-6">
          {['OVERVIEW','BOM','FILES','HISTORY','AUDIT'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`pb-3 text-sm font-medium transition-all relative ${tab===t?'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400':'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{t}</button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* OVERVIEW */}
          {tab==='OVERVIEW'&&(
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {l:'Item Type',v:item.plmType==='P'?'Designed Part':item.plmType==='A'?'Assembly':item.plmType==='C'?'Commercial':'Drawing'},
                  {l:'Current Revision',v:item.revision},
                  {l:'Item Number',v:item.itemNumber||'—'},
                  {l:'Last Modified',v:new Date(item.updatedAt).toLocaleDateString()},
                ].map(({l,v})=>(
                  <div key={l} className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">{l}</p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-950 p-4 rounded-lg border border-gray-100 dark:border-gray-800 min-h-[80px]">
                  {item.description||<span className="text-gray-400 italic">No description provided.</span>}
                </p>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Material Specification</p>
                {isMyCheckout ? (
                  <div className="flex items-center gap-3">
                    <select value={item.materialId || ''} onChange={handleMaterialChange} disabled={actionLoading==='material'} className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50">
                      <option value="">No material assigned</option>
                      {availableMaterials.map(m=>(
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    {actionLoading==='material'&&<RefreshCw className="w-4 h-4 text-gray-400 animate-spin"/>}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    {item.material ? (
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.material.name}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">No material assigned. Checkout item to assign.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BOM */}
          {tab==='BOM'&&(
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500"/>Bill of Materials</h3>
                <div className="flex items-center gap-2">
                  {/* CSV Export */}
                  {!bomEditing&&bom.length>0&&(
                    <button onClick={handleCsvExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <Download className="w-3.5 h-3.5"/>Export CSV
                    </button>
                  )}
                  {/* Flat / Tree toggle */}
                  {!bomEditing&&(
                    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
                      <button onClick={()=>setBomView('flat')} className={`px-2.5 py-1.5 font-medium transition-colors ${bomView==='flat'?'bg-blue-600 text-white':'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Flat</button>
                      <button onClick={()=>setBomView('tree')} className={`px-2.5 py-1.5 font-medium transition-colors ${bomView==='tree'?'bg-blue-600 text-white':'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Tree</button>
                    </div>
                  )}
                  {!item.isLocked&&!bomEditing&&(
                    <button onClick={startBomEdit} className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                      <Plus className="w-4 h-4"/>Edit BOM
                    </button>
                  )}
                  {bomEditing&&(
                    <div className="flex gap-2">
                      <button onClick={saveBom} disabled={actionLoading==='bom'} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50">
                        <Save className="w-3.5 h-3.5"/>{actionLoading==='bom'?'Saving…':'Save BOM'}
                      </button>
                      <button onClick={()=>setBomEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <X className="w-3.5 h-3.5"/>Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {bomEditing?(
                <div className="p-4 space-y-4">
                  <input value={bomSearch} onChange={e=>setBomSearch(e.target.value)} placeholder="Search items to add…" className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"/>
                  {bomSearch&&(
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredItems.slice(0,20).map(i=>(
                        <button key={i.id} onClick={()=>{if(!draftBom.find(r=>r.childId===String(i.id))){setDraftBom(p=>[...p,{childId:String(i.id),quantity:'1'}]);}setBomSearch('');}} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-left border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">{i.sku}</span>
                          <span className="text-gray-500 text-xs truncate ml-2">{i.name}</span>
                        </button>
                      ))}
                      {filteredItems.length===0&&<p className="px-3 py-4 text-sm text-gray-400 text-center">No matching items</p>}
                    </div>
                  )}
                  <div className="space-y-2">
                    {draftBom.map((row,idx)=>{
                      const child=allItems.find(i=>String(i.id)===row.childId);
                      return(
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-xs font-bold text-gray-900 dark:text-white">{child?.sku||row.childId}</p>
                            <p className="text-xs text-gray-500 truncate">{child?.name}</p>
                          </div>
                          <input type="number" min="0.001" step="0.001" value={row.quantity} onChange={e=>setDraftBom(p=>p.map((r,i)=>i===idx?{...r,quantity:e.target.value}:r))} className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm text-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white"/>
                          <button onClick={()=>setDraftBom(p=>p.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      );
                    })}
                    {draftBom.length===0&&<p className="text-sm text-gray-400 text-center py-4">No components. Search above to add.</p>}
                  </div>
                </div>
              ):(bomView==='flat'?(
                // ── Flat view (original) ───────────────────────────────────
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs">
                    <tr>
                      <th className="px-6 py-3 font-medium">#</th>
                      <th className="px-6 py-3 font-medium">Part Number</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Qty</th>
                      <th className="px-6 py-3 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {bom.map((row,idx)=>(
                      <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-6 py-4 text-sm text-gray-400">{idx+1}</td>
                        <td className="px-6 py-4"><Link href={`/dashboard/plm/${row.child.id}`} className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">{row.child.sku}</Link></td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{row.child.name}</td>
                        <td className="px-6 py-4 font-mono text-sm">{row.quantity}</td>
                        <td className="px-6 py-4"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${row.child.plmType==='C'?'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-500/20 dark:bg-amber-500/10':'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-500/20 dark:bg-blue-500/10'}`}>{row.child.plmType==='C'?'COMMERCIAL':'INTERNAL'}</span></td>
                      </tr>
                    ))}
                    {bom.length===0&&<tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">No components in this BOM.</td></tr>}
                  </tbody>
                </table>
              ):(
                // ── Tree view (multi-level indented) ──────────────────────
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(function renderTree(nodes:any[],depth=0):any{
                    return nodes.map((n:any)=>(
                      <div key={n.id}>
                        <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors`} style={{paddingLeft:`${16+depth*24}px`}}>
                          {depth>0&&<div className="w-3 h-px bg-gray-300 dark:bg-gray-600 shrink-0"/>}
                          {n.children?.length>0&&<div className="w-2 h-2 rounded-sm bg-blue-400 shrink-0"/>}
                          {!n.children?.length&&<div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0"/>}
                          <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                            <Link href={`/dashboard/plm/${n.child.id}`} className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">{n.child.sku}</Link>
                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{n.child.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono text-xs text-gray-500">× {n.quantity}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${n.child.plmType==='C'?'text-amber-600 border-amber-200 bg-amber-50 dark:text-amber-300 dark:border-amber-500/20 dark:bg-amber-500/10':'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-500/20 dark:bg-blue-500/10'}`}>{n.child.plmType==='C'?'CMMRCL':'INTERNAL'}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATE_STYLE[n.child.lifecycleState]||''}`}>{n.child.lifecycleState.replace('_',' ')}</span>
                          </div>
                        </div>
                        {n.children?.length>0&&renderTree(n.children,depth+1)}
                      </div>
                    ));
                  })(bomTree)}
                  {bomTree.length===0&&<p className="px-6 py-12 text-center text-gray-400 italic text-sm">No components in this BOM.</p>}
                </div>
              ))}
            </div>
          )}

          {/* FILES */}
          {tab==='FILES'&&(
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500"/>File Attachments</h3>
                <label className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${uploading?'opacity-50 cursor-not-allowed':'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  <Plus className="w-3.5 h-3.5"/>
                  {uploading?'Uploading…':'Upload File'}
                  <input type="file" className="hidden" disabled={uploading} onChange={async e=>{
                    const file=e.target.files?.[0];
                    if(!file)return;
                    setUploading(true);
                    try{
                      const fd=new FormData();
                      fd.append('file',file);
                      const r=await api.post(`/plm/items/${id}/files`,fd,{headers:{'Content-Type':'multipart/form-data'}});
                      setFiles(p=>[r.data,...p]);
                    }catch(err:any){alert(err.response?.data?.error||'Upload failed');}
                    finally{setUploading(false);e.target.value='';}
                  }}/>
                </label>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {files.length===0&&<p className="px-6 py-12 text-center text-sm text-gray-400 italic">No files attached. Upload a PDF, datasheet, or certificate.</p>}
                {files.map((f:any)=>{
                  const ext=f.originalFileName?.split('.').pop()?.toLowerCase()||'';
                  const isImg=['jpg','jpeg','png','gif','webp'].includes(ext);
                  const isPdf=ext==='pdf';
                  const sizeMb=f.fileSize?(f.fileSize/1024/1024).toFixed(2):'?';
                  return(
                    <div key={f.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isPdf?'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400':isImg?'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400':'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          {ext.toUpperCase()||'FILE'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.originalFileName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-400">{sizeMb} MB</span>
                            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono">v{f.version}</span>
                            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                            <span className="text-[11px] text-gray-400">{f.uploadedBy?.name}</span>
                            <span className="text-[11px] text-gray-300 dark:text-gray-600">·</span>
                            <span className="text-[11px] text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={`${(process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api').replace('/api','')}${f.fileUrl}`} target="_blank" rel="noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Download className="w-4 h-4"/>
                        </a>
                        <button onClick={async()=>{if(!confirm('Delete this file?'))return;try{await api.delete(`/plm/items/${id}/files/${f.id}`);setFiles(p=>p.filter((x:any)=>x.id!==f.id));}catch(err:any){alert(err.response?.data?.error||'Delete failed');}}} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 px-5 py-3 border-t border-gray-100 dark:border-gray-800">Max 50 MB per file. PDFs, drawings, datasheets, certificates supported.</p>
            </div>
          )}

          {/* HISTORY */}
          {tab==='HISTORY'&&(
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2"><History className="w-4 h-4 text-blue-500"/>Revision History</h3>
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-200 dark:before:bg-gray-700">
                {history.map(rev=>(
                  <div key={rev.id} className="relative pl-10">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold ${rev.id===item.id?'bg-blue-600 text-white':'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>{rev.revision}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-800">
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">Revision {rev.revision}</span>
                        <span className="ml-2 text-xs text-gray-400">{new Date(rev.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATE_STYLE[rev.lifecycleState]||''}`}>{rev.lifecycleState.replace('_',' ')}</span>
                      {rev.id!==item.id&&<Link href={`/dashboard/plm/${rev.id}`} className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline">View</Link>}
                    </div>
                  </div>
                ))}
                {history.length===0&&<p className="text-sm text-gray-400 pl-10">No revision history.</p>}
              </div>
            </div>
          )}

          {/* AUDIT */}
          {tab==='AUDIT'&&(
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500"/>Audit Log
              </h3>
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gray-100 dark:before:bg-gray-800">
                {auditLogs.map(log=>{
                  const ACTION_STYLE:Record<string,string>={
                    CREATED:'bg-blue-500',CHECKOUT:'bg-amber-500',CHECKIN:'bg-green-500',
                    UNDO_CHECKOUT:'bg-gray-400',STATE_TRANSITION:'bg-purple-500',
                    REVISED:'bg-indigo-500',BOM_UPDATED:'bg-teal-500',
                  };
                  const dot=ACTION_STYLE[log.action]||'bg-gray-400';
                  return(
                    <div key={log.id} className="relative pl-10">
                      <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center ${dot}`}>
                        <span className="w-2 h-2 rounded-full bg-white"/>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{log.action.replace(/_/g,' ')}</span>
                            {log.fromState&&log.toState&&(
                              <span className="text-[10px] text-gray-500">
                                {log.fromState.replace('_',' ')} → {log.toState.replace('_',' ')}
                              </span>
                            )}
                            {log.note&&<span className="text-[10px] text-gray-400 italic">{log.note}</span>}
                          </div>
                          <span className="text-[11px] text-gray-400 shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {log.user?.name||log.user?.email||'Unknown user'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {auditLogs.length===0&&<p className="text-sm text-gray-400 pl-10">No audit entries yet.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Lifecycle Management</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">Edit Access</span>
                {item.isLocked?<Lock className="w-4 h-4 text-red-400"/>:<Unlock className="w-4 h-4 text-green-500"/>}
              </div>
              <p className="text-xs text-gray-400 italic leading-relaxed px-1">
                {item.isLocked&&!isCheckedOut?'Locked. Create a new revision to make changes.':isMyCheckout?'You have this item checked out. Others see it as read-only.':isCheckedOut?`Checked out by ${item.checkedOutBy?.name||'another user'}.`:'IN WORK — available to check out.'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Creo Actions</h4>
            {/* Creo availability badge */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-3 border ${creoAvailable?'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20':'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:border-gray-700'}`}>
              <div className={`w-2 h-2 rounded-full ${creoAvailable?'bg-green-500':'bg-gray-400'}`}/>
              {creoAvailable?'Creo session detected':'No Creo session'}
            </div>
            {creoStatus&&<p className="text-xs text-blue-600 dark:text-blue-400 mb-3 px-1">{creoStatus}</p>}
            <div className="space-y-2">
              <button
                onClick={async()=>{if(!item?.plmItemLink){alert('No file path set for this item.');return;}setCreoStatus('Opening in Creo…');const r=await creoService.openInCreo(item.plmItemLink);setCreoStatus(r.success?'Opened in Creo ✓':r.error||'Failed to open');}}
                disabled={!creoAvailable||!item?.plmItemLink}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-100 dark:border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ExternalLink className="w-4 h-4"/>Open in Creo
              </button>
              <button
                onClick={async()=>{if(!item?.plmItemLink){alert('No file path set for this item.');return;}setCreoStatus('Exporting STEP…');const r=await creoService.exportSTEP(item.plmItemLink);setCreoStatus(r.success?`STEP exported: ${r.filePath}`:r.error||'Export failed');}}
                disabled={!creoAvailable||!item?.plmItemLink}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-100 dark:border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4"/>Export STEP
              </button>
              <button
                onClick={async()=>{if(!item?.plmItemLink){alert('No file path set for this item.');return;}setCreoStatus('Exporting PDF…');const r=await creoService.exportPDF(item.plmItemLink);setCreoStatus(r.success?`PDF exported: ${r.filePath}`:r.error||'Export failed');}}
                disabled={!creoAvailable||!item?.plmItemLink}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-100 dark:border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4"/>Export Drawing (PDF)
              </button>
              <button
                onClick={async()=>{if(!item?.plmItemLink){alert('No file path set for this item.');return;}setCreoStatus('Syncing params…');const r=await creoService.syncParamsToCreo(item.plmItemLink,{partNumber:item.sku,description:item.name,revision:item.revision});setCreoStatus(r.success?'Params synced to Creo ✓':r.error||'Sync failed');}}
                disabled={!creoAvailable||!item?.plmItemLink}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-100 dark:border-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4"/>Sync Params to Creo
              </button>
            </div>
            {!item?.plmItemLink&&<p className="text-xs text-gray-400 mt-3 italic">Set a file path (plmItemLink) on this item to enable Creo actions.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
