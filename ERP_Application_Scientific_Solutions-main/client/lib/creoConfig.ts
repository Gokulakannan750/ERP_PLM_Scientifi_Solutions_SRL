// ─── Creo Integration Configuration ─────────────────────────────────────────
// Change CREO_ADAPTER to switch implementations without touching any other code.
//
//  'weblink'  → Option 2: PFC/Web.Link (runs inside Creo embedded browser)
//  'jlink'    → Option 3: Custom J-Link middleware (local REST server)
//  'mock'     → No-op, for development / non-Creo environments

export type CreoAdapter = 'weblink' | 'jlink' | 'mock';

const creoConfig = {
  // ── Active adapter ─────────────────────────────────────────────────────────
  CREO_ADAPTER: (process.env.NEXT_PUBLIC_CREO_ADAPTER as CreoAdapter) || 'weblink',

  // ── J-Link middleware URL (used only when CREO_ADAPTER = 'jlink') ──────────
  JLINK_BASE_URL: process.env.NEXT_PUBLIC_JLINK_URL || 'http://localhost:8080/creo',

  // ── PFC library path relative to Creo installation ────────────────────────
  // Creo ships this at: <Creo install>\Common Files\weblink\pfcweb.js
  // Loaded automatically when running inside Creo's embedded browser.
  PFC_SCRIPT_PATH: process.env.NEXT_PUBLIC_PFC_PATH || '/pfcweb.js',
} as const;

export default creoConfig;
