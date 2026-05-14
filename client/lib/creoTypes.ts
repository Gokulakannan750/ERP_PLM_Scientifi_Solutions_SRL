// ─── Shared Creo adapter types ────────────────────────────────────────────────
// All adapters must implement ICreoAdapter.
// Adding Option 3 later = implement this interface in jlinkAdapter.ts only.

export interface CreoParams {
  PART_NUMBER?: string;   // e.g. "P00035A"
  DESCRIPTION?: string;   // item name
  REVISION?: string;      // e.g. "A"
  PTC_MATERIAL_NAME?: string;
  [key: string]: string | undefined;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;  // where the exported file was saved
  error?: string;
}

export interface OpenResult {
  success: boolean;
  error?: string;
}

export interface ParamResult {
  success: boolean;
  error?: string;
}

export interface ICreoAdapter {
  /** Check if this adapter can connect to a running Creo session */
  isAvailable(): boolean;

  /** Open a CAD file in the active Creo session */
  openFile(networkPath: string): Promise<OpenResult>;

  /** Export the active model (or a given file) to STEP format */
  exportSTEP(networkPath: string, outputPath?: string): Promise<ExportResult>;

  /** Export the active model (or a given file) to PDF (via drawing) */
  exportPDF(networkPath: string, outputPath?: string): Promise<ExportResult>;

  /** Write parameters (PART_NUMBER, DESCRIPTION etc.) into the model */
  setParameters(networkPath: string, params: CreoParams): Promise<ParamResult>;

  /** Read all parameters from the model and return them */
  getParameters(networkPath: string): Promise<Record<string, string>>;
}
