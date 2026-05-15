// ─── CAD Service — unified interface for Creo and FreeCAD ────────────────────
// Each PLM item carries a cadTool field ('NONE' | 'CREO' | 'FREECAD').
// Pass that value to every function here — the service routes to the right
// adapter automatically. No env var change needed to switch tools.
//
// Usage:
//   import cadService from '@/lib/creoService';
//   await cadService.openInCreo(item.plmItemLink, item.cadTool);

import type { ICreoAdapter, CreoParams } from './creoTypes';

// ── Per-tool adapter cache (lazy-loaded once per tool type) ───────────────────
const _cache = new Map<string, ICreoAdapter>();

async function getAdapter(cadTool: string): Promise<ICreoAdapter> {
  const tool = (cadTool || 'NONE').toUpperCase();

  if (_cache.has(tool)) return _cache.get(tool)!;

  let adapter: ICreoAdapter;

  if (tool === 'FREECAD') {
    const { FreecadAdapter } = await import('./adapters/freecadAdapter');
    adapter = new FreecadAdapter();
  } else if (tool === 'CREO') {
    const creoConfig = (await import('./creoConfig')).default;
    if (creoConfig.CREO_VARIANT === 'weblink') {
      const { WeblinkAdapter } = await import('./adapters/weblinkAdapter');
      adapter = new WeblinkAdapter();
    } else {
      const { JLinkAdapter } = await import('./adapters/jlinkAdapter');
      adapter = new JLinkAdapter();
    }
  } else {
    const { MockAdapter } = await import('./adapters/mockAdapter');
    adapter = new MockAdapter();
  }

  _cache.set(tool, adapter);
  return adapter;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the adapter for the given cadTool can connect to a live session */
export async function isCreoAvailable(cadTool = 'NONE'): Promise<boolean> {
  try {
    const adapter = await getAdapter(cadTool);
    return adapter.isAvailable();
  } catch {
    return false;
  }
}

/** Open a CAD file in the session for the given tool */
export async function openInCreo(networkPath: string, cadTool = 'NONE') {
  const adapter = await getAdapter(cadTool);
  return adapter.openFile(networkPath);
}

/** Export to STEP using the adapter for the given tool */
export async function exportSTEP(networkPath: string, cadTool = 'NONE', outputPath?: string) {
  const adapter = await getAdapter(cadTool);
  return adapter.exportSTEP(networkPath, outputPath);
}

/** Export to PDF using the adapter for the given tool */
export async function exportPDF(networkPath: string, cadTool = 'NONE', outputPath?: string) {
  const adapter = await getAdapter(cadTool);
  return adapter.exportPDF(networkPath, outputPath);
}

/** Write ERP parameters into the CAD file */
export async function syncParamsToCreo(networkPath: string, params: CreoParams, cadTool = 'NONE') {
  const adapter = await getAdapter(cadTool);
  return adapter.setParameters(networkPath, params);
}

/** Read all parameters from the CAD file */
export async function readParamsFromCreo(networkPath: string, cadTool = 'NONE') {
  const adapter = await getAdapter(cadTool);
  return adapter.getParameters(networkPath);
}

/** Full check-in sync: write params + read back */
export async function performCheckinSync(
  networkPath: string,
  params: CreoParams,
  cadTool = 'NONE',
): Promise<{
  paramWriteResult: Awaited<ReturnType<typeof syncParamsToCreo>>;
  modelParams: Record<string, string>;
}> {
  const [paramWriteResult, modelParams] = await Promise.all([
    syncParamsToCreo(networkPath, params, cadTool),
    readParamsFromCreo(networkPath, cadTool),
  ]);
  return { paramWriteResult, modelParams };
}

const cadService = {
  isCreoAvailable,
  openInCreo,
  exportSTEP,
  exportPDF,
  syncParamsToCreo,
  readParamsFromCreo,
  performCheckinSync,
};

export default cadService;
