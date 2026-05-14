// ─── Mock Adapter — development / non-Creo environments ─────────────────────
// Used when NEXT_PUBLIC_CREO_ADAPTER=mock (or no Creo available).
// Logs calls to console and returns success so the UI can be tested.

import type {
  ICreoAdapter, CreoParams, ExportResult, OpenResult, ParamResult
} from '../creoTypes';

export class MockAdapter implements ICreoAdapter {
  isAvailable(): boolean { return true; }

  async openFile(networkPath: string): Promise<OpenResult> {
    console.log('[MockCreo] openFile:', networkPath);
    return { success: true };
  }

  async exportSTEP(networkPath: string, outputPath?: string): Promise<ExportResult> {
    console.log('[MockCreo] exportSTEP:', networkPath, '→', outputPath);
    return { success: true, filePath: outputPath || networkPath.replace(/\.[^.]+$/, '.stp') };
  }

  async exportPDF(networkPath: string, outputPath?: string): Promise<ExportResult> {
    console.log('[MockCreo] exportPDF:', networkPath, '→', outputPath);
    return { success: true, filePath: outputPath || networkPath.replace(/\.[^.]+$/, '.pdf') };
  }

  async setParameters(networkPath: string, params: CreoParams): Promise<ParamResult> {
    console.log('[MockCreo] setParameters:', networkPath, params);
    return { success: true };
  }

  async getParameters(networkPath: string): Promise<Record<string, string>> {
    console.log('[MockCreo] getParameters:', networkPath);
    return { PART_NUMBER: 'MOCK', DESCRIPTION: 'Mock model' };
  }
}
