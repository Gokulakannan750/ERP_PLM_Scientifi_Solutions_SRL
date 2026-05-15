// ─── CreoService — Unified Creo Integration Service ──────────────────────────
// This is the ONLY file the rest of the ERP imports for Creo operations.
// To switch adapters, change NEXT_PUBLIC_CREO_ADAPTER in .env.local — done.
//
// Usage anywhere in the app:
//   import creoService from '@/lib/creoService';
//   const result = await creoService.openFile(item.filePath);

import creoConfig from './creoConfig';
import type { ICreoAdapter, CreoParams } from './creoTypes';

// ── Lazy-load adapter based on config ─────────────────────────────────────────
let _adapter: ICreoAdapter | null = null;

async function getAdapter(): Promise<ICreoAdapter> {
  if (_adapter) return _adapter;

  const type = creoConfig.CREO_ADAPTER;

  if (type === 'weblink') {
    const { WeblinkAdapter } = await import('./adapters/weblinkAdapter');
    _adapter = new WeblinkAdapter();
  } else if (type === 'jlink') {
    const { JLinkAdapter } = await import('./adapters/jlinkAdapter');
    _adapter = new JLinkAdapter();
  } else if (type === 'freecad') {
    const { FreecadAdapter } = await import('./adapters/freecadAdapter');
    _adapter = new FreecadAdapter();
  } else {
    const { MockAdapter } = await import('./adapters/mockAdapter');
    _adapter = new MockAdapter();
  }

  return _adapter;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true if the active adapter can connect to a running Creo session */
export async function isCreoAvailable(): Promise<boolean> {
  try {
    const adapter = await getAdapter();
    return adapter.isAvailable();
  } catch {
    return false;
  }
}

/**
 * Open a CAD file in the active Creo session.
 * @param networkPath  Full network path to the .prt / .asm / .drw file
 */
export async function openInCreo(networkPath: string) {
  const adapter = await getAdapter();
  return adapter.openFile(networkPath);
}

/**
 * Export the given file to STEP format.
 * @param networkPath  Source CAD file path
 * @param outputPath   Optional output path (defaults to same dir, .stp extension)
 */
export async function exportSTEP(networkPath: string, outputPath?: string) {
  const adapter = await getAdapter();
  return adapter.exportSTEP(networkPath, outputPath);
}

/**
 * Export the given file to PDF (via associated drawing).
 * @param networkPath  Source CAD file path
 * @param outputPath   Optional output path (defaults to same dir, .pdf extension)
 */
export async function exportPDF(networkPath: string, outputPath?: string) {
  const adapter = await getAdapter();
  return adapter.exportPDF(networkPath, outputPath);
}

/**
 * Write ERP parameters (PART_NUMBER, DESCRIPTION, REVISION) into the model.
 * Called automatically on Check-In to sync ERP data → CAD file.
 * @param networkPath  Path to the CAD file
 * @param params       Parameters to write
 */
export async function syncParamsToCreo(networkPath: string, params: CreoParams) {
  const adapter = await getAdapter();
  return adapter.setParameters(networkPath, params);
}

/**
 * Read all model parameters from a Creo file.
 * Called on Check-In to sync CAD params → ERP database.
 * @param networkPath  Path to the CAD file
 */
export async function readParamsFromCreo(networkPath: string) {
  const adapter = await getAdapter();
  return adapter.getParameters(networkPath);
}

// ── Convenience: full Check-In sync (params + unlock) ─────────────────────────
/**
 * Perform the full Check-In Creo workflow:
 *  1. Write ERP params to model (PART_NUMBER, DESCRIPTION, REVISION)
 *  2. Return params read back from the model for DB update
 */
export async function performCheckinSync(
  networkPath: string,
  params: CreoParams
): Promise<{ paramWriteResult: Awaited<ReturnType<typeof syncParamsToCreo>>; modelParams: Record<string, string> }> {
  const [paramWriteResult, modelParams] = await Promise.all([
    syncParamsToCreo(networkPath, params),
    readParamsFromCreo(networkPath),
  ]);
  return { paramWriteResult, modelParams };
}

const creoService = {
  isCreoAvailable,
  openInCreo,
  exportSTEP,
  exportPDF,
  syncParamsToCreo,
  readParamsFromCreo,
  performCheckinSync,
};

export default creoService;
