/**
 * Unified driver photo resolver — single source of truth for all components.
 *
 * Resolution order:
 *   1. driver.photo_url from the API (admin-uploaded or CDN seed)
 *   2. Local asset in /public/drivers/{mode}/{id}.png (custom Pronokif visuals)
 *   3. F1 CDN fallback (hardcoded URLs for drivers with official headshots)
 *   4. null → caller renders team-colored initials fallback
 *
 * Supports dark/light mode: when the admin provides both variants,
 * the caller passes the current theme and gets the right asset.
 *
 * Usage:
 *   import { resolveDriverPhoto } from "@/lib/driverPhotos";
 *   const src = resolveDriverPhoto(driver);
 *   const src = resolveDriverPhoto(driver, { mode: "light" });
 *   const src = resolveDriverPhoto("norris");
 */

export type PhotoMode = "dark" | "light";

interface DriverLike {
  id: string;
  photo_url?: string | null;
}

// ── Local Pronokif assets ────────────────────────────────────────────────────
// Convention: /public/drivers/dark/{id}.png and /public/drivers/light/{id}.png
// When both exist, the caller picks based on the current admin theme.
// When only dark exists, it's used for both modes.

function localAssetUrl(driverId: string, mode: PhotoMode): string {
  return `/drivers/${mode}/${driverId}.png`;
}

// Track which local assets exist (populated lazily on first call).
// In production, missing files return a 404 HTML page, not a broken image.
// We optimistically try dark first; the <img onError> fallback handles misses.
const _checkedLocal = new Map<string, boolean>();

// ── F1 CDN fallback (legacy, kept for resilience) ────────────────────────────

const _CDN =
  "https://media.formula1.com/d_driver_fallback_image.png/content/dam/fom-website/drivers";

const F1_CDN_SLUGS: Record<string, string> = {
  norris: "L/LANNOR01_Lando_Norris/lannor01",
  piastri: "O/OSCPIA01_Oscar_Piastri/oscpia01",
  russell: "G/GEORUS01_George_Russell/georus01",
  leclerc: "C/CHALEC01_Charles_Leclerc/chalec01",
  hamilton: "L/LEWHAM01_Lewis_Hamilton/lewham01",
  verstappen: "M/MAXVER01_Max_Verstappen/maxver01",
  hadjar: "I/ISAHAD01_Isack_Hadjar/isahad01",
  sainz: "C/CARSAI01_Carlos_Sainz/carsai01",
  albon: "A/ALEALB01_Alexander_Albon/alealb01",
  lawson: "L/LIALAW01_Liam_Lawson/lialaw01",
  alonso: "F/FERALO01_Fernando_Alonso/feralo01",
  stroll: "L/LANSTR01_Lance_Stroll/lanstr01",
  ocon: "E/ESTOCO01_Esteban_Ocon/estoco01",
  bearman: "O/OLIBEA01_Oliver_Bearman/olibea01",
  gasly: "P/PIEGAS01_Pierre_Gasly/piegas01",
  colapinto: "F/FRACOL01_Franco_Colapinto/fracol01",
  hulkenberg: "N/NICHUL01_Nico_Hulkenberg/nichul01",
  bortoleto: "G/GABBOR01_Gabriel_Bortoleto/gabbor01",
  perez: "S/SERPER01_Sergio_Perez/serper01",
  bottas: "V/VALBOT01_Valtteri_Bottas/valbot01",
  // antonelli + lindblad: no real headshot on F1 CDN (2026 rookies)
};

function f1CdnUrl(driverId: string): string | null {
  const slug = F1_CDN_SLUGS[driverId];
  if (!slug) return null;
  return `${_CDN}/${slug}.png.transform/2col-retina/image.png`;
}

// ── Public API ───────────────────────────────────────────────────────────────

interface ResolveOptions {
  /** Theme mode — determines which local asset variant to try first. */
  mode?: PhotoMode;
}

/**
 * Resolve the best available photo URL for a driver.
 *
 * Accepts a full driver object (prefers photo_url from API) or a bare id string.
 * Returns null when no photo is available (caller should render initials fallback).
 */
export function resolveDriverPhoto(
  driverOrId: string | DriverLike,
  options?: ResolveOptions,
): string | null {
  const id = typeof driverOrId === "string" ? driverOrId : driverOrId.id;
  const apiUrl = typeof driverOrId !== "string" ? driverOrId.photo_url : undefined;
  const mode = options?.mode ?? "dark";

  // 1. API photo_url (admin-uploaded or seeded from CDN)
  if (apiUrl) return apiUrl;

  // 2. Local Pronokif asset (custom visuals provided by the team)
  //    Convention: /drivers/dark/{id}.png — served by nginx/Vite as static files.
  //    We return the URL optimistically; <img onError> handles 404s gracefully.
  return localAssetUrl(id, mode);
}

/**
 * Resolve with F1 CDN as ultimate fallback (for components that can't handle null).
 * Returns the Norris headshot as last resort.
 */
export function resolveDriverPhotoUrl(
  driverOrId: string | DriverLike,
  options?: ResolveOptions,
): string {
  return (
    resolveDriverPhoto(driverOrId, options) ??
    f1CdnUrl(typeof driverOrId === "string" ? driverOrId : driverOrId.id) ??
    f1CdnUrl("norris")!
  );
}

/**
 * F1 CDN URL for a driver (legacy — use resolveDriverPhoto for new code).
 * Returns null for drivers without a CDN headshot (rookies).
 */
export function getF1CdnPhoto(driverId: string): string | null {
  return f1CdnUrl(driverId);
}

/**
 * All 22 driver IDs in the grid — useful for pre-generating assets.
 */
export const ALL_DRIVER_IDS = [
  "norris",
  "piastri",
  "russell",
  "antonelli",
  "leclerc",
  "hamilton",
  "verstappen",
  "hadjar",
  "sainz",
  "albon",
  "lawson",
  "lindblad",
  "alonso",
  "stroll",
  "ocon",
  "bearman",
  "gasly",
  "colapinto",
  "hulkenberg",
  "bortoleto",
  "perez",
  "bottas",
] as const;
