// ─── FreeCAD Bridge Adapter ───────────────────────────────────────────────────
// Bridges the ERP to the local FreeCAD bridge server (freecad-server/app.py).
//
// Setup:
//   1. Install FreeCAD: https://www.freecad.org/downloads.php
//   2. cd freecad-server && pip install -r requirements.txt
//   3. Copy .env.example → .env and set FREECAD_LIB_PATH
//   4. python app.py   (starts on port 7474 by default)
//   5. Set in .env.local:
//        NEXT_PUBLIC_CREO_ADAPTER=freecad
//        NEXT_PUBLIC_FREECAD_SERVER_URL=http://localhost:7474
//
// Endpoints exposed by the bridge (mirrors J-Link contract):
//   GET  /health
//   POST /file/open        { path }
//   POST /file/export/step { path, outputPath? }
//   POST /file/export/pdf  { path, outputPath? }
//   POST /params/set       { path, params }
//   GET  /params/get?path=...

import type {
    ICreoAdapter, CreoParams, ExportResult, OpenResult, ParamResult,
} from '../creoTypes';

const BASE_URL =
    process.env.NEXT_PUBLIC_FREECAD_SERVER_URL || 'http://localhost:7474';

export class FreecadAdapter implements ICreoAdapter {
    private _available: boolean | null = null;
    private _lastCheck = 0;
    private readonly CACHE_MS = 30_000;

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private async post<T>(endpoint: string, body: object): Promise<T> {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`FreeCAD bridge [${res.status}]: ${text}`);
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error(`FreeCAD bridge returned non-JSON: ${text}`);
        }
    }

    private async get<T>(endpoint: string): Promise<T> {
        const res = await fetch(`${BASE_URL}${endpoint}`);
        const text = await res.text();
        if (!res.ok) throw new Error(`FreeCAD bridge [${res.status}]: ${text}`);
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error(`FreeCAD bridge returned non-JSON: ${text}`);
        }
    }

    // ── Health check (cached 30 s) ─────────────────────────────────────────

    isAvailable(): boolean {
        const now = Date.now();
        if (this._available === null || now - this._lastCheck > this.CACHE_MS) {
            this._lastCheck = now;
            this.ping()
                .then(ok => { this._available = ok; })
                .catch(() => { this._available = false; });
        }
        return this._available ?? true;
    }

    async ping(): Promise<boolean> {
        try {
            const data = await this.get<{ status: string; freecad_available: boolean }>('/health');
            return data?.status === 'ok' && data?.freecad_available === true;
        } catch {
            return false;
        }
    }

    // ── ICreoAdapter implementation ───────────────────────────────────────────

    async openFile(networkPath: string): Promise<OpenResult> {
        try {
            const data = await this.post<{ success: boolean; error?: string }>(
                '/file/open',
                { path: networkPath },
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
                { path: networkPath, outputPath: outputPath ?? null },
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
                { path: networkPath, outputPath: outputPath ?? null },
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
                { path: networkPath, params: filtered },
            );
            return { success: data.success, error: data.error };
        } catch (e: unknown) {
            return { success: false, error: e instanceof Error ? e.message : String(e) };
        }
    }

    async getParameters(networkPath: string): Promise<Record<string, string>> {
        try {
            return await this.get<Record<string, string>>(
                `/params/get?path=${encodeURIComponent(networkPath)}`,
            );
        } catch {
            return {};
        }
    }
}
