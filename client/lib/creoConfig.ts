// ─── CAD Integration Configuration ───────────────────────────────────────────
// .env.local example:
//   NEXT_PUBLIC_CREO_VARIANT=jlink          # jlink | weblink
//   NEXT_PUBLIC_JLINK_URL=http://localhost:8080/creo

export type CadTool = 'NONE' | 'CREO';
export type CreoVariant = 'jlink' | 'weblink';

const creoConfig = {
  // ── Creo: which sub-adapter to use (jlink = local Java bridge, weblink = PFC) ─
  CREO_VARIANT: (process.env.NEXT_PUBLIC_CREO_VARIANT as CreoVariant) || 'jlink',

  // ── Creo J-Link bridge URL ─────────────────────────────────────────────────
  JLINK_BASE_URL: process.env.NEXT_PUBLIC_JLINK_URL || 'http://localhost:8080/creo',

  // ── PFC library path (weblink only) ───────────────────────────────────────
  PFC_SCRIPT_PATH: process.env.NEXT_PUBLIC_PFC_PATH || '/pfcweb.js',
} as const;

export default creoConfig;
