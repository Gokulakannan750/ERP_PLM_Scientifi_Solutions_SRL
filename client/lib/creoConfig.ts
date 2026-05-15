// ─── CAD Integration Configuration ───────────────────────────────────────────
// Change CREO_ADAPTER to switch CAD back-ends without touching any other code.
//
//  'weblink'  → PFC/Web.Link (runs inside Creo's embedded browser)
//  'jlink'    → Custom J-Link middleware (local Java REST server)
//  'freecad'  → FreeCAD bridge server (freecad-server/app.py)
//  'mock'     → No-op, for development / environments without a CAD install

export type CreoAdapter = 'weblink' | 'jlink' | 'freecad' | 'mock';

const creoConfig = {
  // ── Active adapter ─────────────────────────────────────────────────────────
  CREO_ADAPTER: (process.env.NEXT_PUBLIC_CREO_ADAPTER as CreoAdapter) || 'mock',

  // ── J-Link middleware URL (used only when CREO_ADAPTER = 'jlink') ──────────
  JLINK_BASE_URL: process.env.NEXT_PUBLIC_JLINK_URL || 'http://localhost:8080/creo',

  // ── FreeCAD bridge URL (used only when CREO_ADAPTER = 'freecad') ──────────
  FREECAD_SERVER_URL: process.env.NEXT_PUBLIC_FREECAD_SERVER_URL || 'http://localhost:7474',

  // ── PFC library path relative to Creo installation ────────────────────────
  // Creo ships this at: <Creo install>\Common Files\weblink\pfcweb.js
  // Loaded automatically when running inside Creo's embedded browser.
  PFC_SCRIPT_PATH: process.env.NEXT_PUBLIC_PFC_PATH || '/pfcweb.js',
} as const;

export default creoConfig;
