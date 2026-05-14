/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// ─── Option 2: Creo Web.Link / PFC Adapter ───────────────────────────────────
// Uses PTC's PFC JavaScript library, available when ERP is loaded inside
// Creo Parametric's embedded Chromium browser (Navigator panel).
//
// Setup required on each engineer's machine:
//   1. In Creo config.pro: set web_enable_javascript  yes
//   2. In Creo config.pro: set windows_browser_type   chromium_browser
//   3. Open ERP URL in Creo browser: View → Navigator → enter ERP URL
//
// PFC docs: <Creo install>\Common Files\weblink\docs\index.html

import type {
  ICreoAdapter, CreoParams, ExportResult, OpenResult, ParamResult
} from '../creoTypes';

// PFC global injected by Creo's browser environment
declare const pfcGetProESession: () => any;
declare const pfcCreate: (cls: string, ...args: any[]) => any;

export class WeblinkAdapter implements ICreoAdapter {

  isAvailable(): boolean {
    try {
      return typeof pfcGetProESession === 'function';
    } catch {
      return false;
    }
  }

  private getSession() {
    if (!this.isAvailable()) {
      throw new Error('Creo is not running or ERP is not loaded in Creo browser.');
    }
    return pfcGetProESession();
  }

  async openFile(networkPath: string): Promise<OpenResult> {
    try {
      const session = this.getSession();
      // PFC: session.OpenFile(path, genericName, rev)
      session.OpenFile(networkPath, '', '');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  async exportSTEP(networkPath: string, outputPath?: string): Promise<ExportResult> {
    try {
      const session = this.getSession();
      const model = session.GetCurrentWindow().GetModel();

      // Build STEP export instructions
      const stepInst = pfcCreate('pfcSTEPExportInstructions');
      stepInst.SetAssemblyConfiguration(1); // pfcStepAssembly.ALL_PARTS
      stepInst.SetLayerOption(1);

      const exportPath = outputPath || networkPath.replace(/\.[^.]+$/, '.stp');
      model.Export(exportPath, stepInst);

      return { success: true, filePath: exportPath };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  async exportPDF(networkPath: string, outputPath?: string): Promise<ExportResult> {
    try {
      const session = this.getSession();
      const model = session.GetCurrentWindow().GetModel();

      const pdfInst = pfcCreate('pfcPDFExportInstructions');
      pdfInst.SetSheetRange(1); // pfcSheetRange.ALL_SHEETS

      const exportPath = outputPath || networkPath.replace(/\.[^.]+$/, '.pdf');
      model.Export(exportPath, pdfInst);

      return { success: true, filePath: exportPath };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  async setParameters(networkPath: string, params: CreoParams): Promise<ParamResult> {
    try {
      const session = this.getSession();
      const model = session.GetCurrentWindow().GetModel();
      const paramOwner = model.GetParam ? model : session;

      for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        try {
          const param = paramOwner.GetParam(key);
          if (param) {
            param.SetValue(pfcCreate('pfcStringParamValue', value));
          } else {
            // Create parameter if it doesn't exist
            const newParam = pfcCreate('pfcParamDefinition', key, pfcCreate('pfcStringParamValue', value));
            paramOwner.CreateParam(newParam);
          }
        } catch {
          // Skip params that fail individually — don't abort whole operation
        }
      }

      // Regenerate model to apply changes
      model.Regenerate(pfcCreate('pfcRegenInstructions', 1));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || String(e) };
    }
  }

  async getParameters(networkPath: string): Promise<Record<string, string>> {
    try {
      const session = this.getSession();
      const model = session.GetCurrentWindow().GetModel();
      const params = model.ListParams();
      const result: Record<string, string> = {};

      if (params) {
        for (let i = 0; i < params.Count; i++) {
          const p = params.Item(i);
          try {
            result[p.Name] = String(p.Value.DiscriminatorValue || p.Value);
          } catch {
            // skip unreadable param
          }
        }
      }

      return result;
    } catch {
      return {};
    }
  }
}
