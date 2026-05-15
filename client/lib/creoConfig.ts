// ─── CAD Integration Configuration ───────────────────────────────────────────
// Both Creo and FreeCAD can be active at the same time.
// Each PLM item stores its own cadTool value (NONE | CREO | FREECAD).
// These env vars configure the connection details for each tool.
//
// .env.local example:
//   NEXT_PUBLIC_CREO_VARIANT=jlink          # jlink | weblink
//   NEXT_PUBLIC_JLINK_URL=http://localhost:8080/creo
//   NEXT_PUBLIC_FREECAD_SERVER_URL=http://localhost:7474

export type CadTool = 'NONE' | 'CREO' | 'FREECAD';
export type CreoVariant = 'jlink' | 'weblink';

const creoConfig = {
  // ── Creo: which sub-adapter to use (jlink = local Java bridge, weblink = PFC) ─
  CREO_VARIANT: (process.env.NEXT_PUBLIC_CREO_VARIANT as CreoVariant) || 'jlink',

  // ── Creo J-Link bridge URL ─────────────────────────────────────────────────
  JLINK_BASE_URL: process.env.NEXT_PUBLIC_JLINK_URL || 'http://localhost:8080/creo',

  // ── FreeCAD bridge URL ─────────────────────────────────────────────────────
  FREECAD_SERVER_URL: process.env.NEXT_PUBLIC_FREECAD_SERVER_URL || 'http://localhost:7474',

  // ── PFC library path (weblink only) ───────────────────────────────────────
  PFC_SCRIPT_PATH: process.env.NEXT_PUBLIC_PFC_PATH || '/pfcweb.js',
} as const;

export default creoConfig;
