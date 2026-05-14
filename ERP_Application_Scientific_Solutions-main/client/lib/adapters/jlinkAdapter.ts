// ─── Option 3: J-Link Middleware Adapter ─────────────────────────────────────
// Bridges the ERP to a local Java J-Link REST server (creo-jlink-bridge).
//
// Setup:
//   1. Build the Java bridge: `mvn package` inside the creo-jlink-bridge project.
//   2. Run it: `java -jar creo-jlink-bridge.jar` (default port 8080, configurable).
//   3. Set NEXT_PUBLIC_CREO_ADAPTER=jlink in .env.local.
//   4. Set NEXT_PUBLIC_JLINK_URL=http://localhost:8080/creo (or your chosen host/port).
//
// The bridge exposes these REST endpoints:
//   GET  /creo/health                            → { status: "ok" }
//   POST /creo/file/open      { path }           → { success, error? }
//   POST /creo/file/export/step { path, outputPath? } → { success, filePath?, error? }
//   POST /creo/file/export/pdf  { path, outputPath? } → { success, filePath?, error? }
//   POST /creo/params/set     { path, params }   → { success, error? }
//   GET  /creo/params/get?path=...               → { PART_NUMBER: "...", ... }

import creoConfig from '../creoConfig';
import type {
  ICreoAdapter, CreoParams, ExportResult, OpenResult, ParamResult
} from '../creoTypes';

export class JLinkAdapter implements ICreoAdapter {
  private base = creoConfig.JLINK_BASE_URL;
  private _available: boolean | null = null;

  // ── Low-level HTTP helpers ────────────────────────────────────────────────

  private async post<T>(endpoint: string, body: object): Promise<T> {
    const res = await fetch(`${this.base}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`J-Link bridge [${res.status}]: ${text}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`J-Link bridge returned non-JSON response: ${text}`);
    }
  }

  private async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${this.base}${endpoint}`);
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`J-Link bridge [${res.status}]: ${text}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`J-Link bridge returned non-JSON response: ${text}`);
    }
  }

  // ── Health check (cached for 30 s to avoid hammering the bridge) ─────────

  private _lastCheck = 0;
  private readonly CACHE_MS = 30_000;

  isAvailable(): boolean {
    // Return cached result synchronously; refresh asynchronously in background
    const now = Date.now();
    if (this._available === null || now - this._lastCheck > this.CACHE_MS) {
      this._lastCheck = now;
      this.pingBridge().then(ok => { this._available = ok; }).catch(() => { this._available = false; });
    }
    // On first call _available is null — treat as available (optimistic) so
    // callers don't block; the actual call will surface real errors.
    return this._available ?? true;
  }

  async pingBridge(): Promise<boolean> {
    try {
      const data = await this.get<{ status: string }>('/health');
      return data?.status === 'ok';
    } catch {
      return false;
    }
  }

  // ── ICreoAdapter implementation ───────────────────────────────────────────

  async openFile(networkPath: string): Promise<OpenResult> {
    try {
      const data = await this.post<{ success: boolean; error?: string }>(
        '/file/open',
        { path: networkPath }
      );
      return { success: data.success, error: data.error };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async exportSTEP(networkPath: string, outputPath?: string): Promise<ExportResult> {
    try {
      const data = await this.post<{ success: boolean; filePath?: string; error?: string }>(
        '/file/export/step',
        { path: networkPath, outputPath: outputPath ?? null }
      );
      return { success: data.success, filePath: data.filePath, error: data.error };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async exportPDF(networkPath: string, outputPath?: string): Promise<ExportResult> {
    try {
      const data = await this.post<{ success: boolean; filePath?: string; error?: string }>(
        '/file/export/pdf',
        { path: networkPath, outputPath: outputPath ?? null }
      );
      return { success: data.success, filePath: data.filePath, error: data.error };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async setParameters(networkPath: string, params: CreoParams): Promise<ParamResult> {
    try {
      const filtered: Record<string, string> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) filtered[k] = v;
      }
      const data = await this.post<{ success: boolean; error?: string }>(
        '/params/set',
        { path: networkPath, params: filtered }
      );
      return { success: data.success, error: data.error };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async getParameters(networkPath: string): Promise<Record<string, string>> {
    try {
      const data = await this.get<Record<string, string>>(
        `/params/get?path=${encodeURIComponent(networkPath)}`
      );
      return data ?? {};
    } catch {
      return {};
    }
  }
}
