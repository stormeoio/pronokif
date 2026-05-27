/**
 * PronoKif — Brand Tokens
 * Source of truth: DESIGN.md (Broadcast Premium)
 *
 * Usage:
 *   import { brand, podium } from "@/lib/brand";
 *   <div style={{ color: brand.red }}>
 */

/* ------------------------------------------------
   PALETTE OFFICIELLE
   ------------------------------------------------ */
export const brand = {
  /** Rouge Vitesse — #E10600 */
  red: "#E10600",
  redHover: "#C00500",
  redGlow: "rgba(225, 6, 0, 0.4)",
  redSubtle: "rgba(225, 6, 0, 0.08)",

  /** Noir Carbone — #0B0D12 */
  carbon: "#0B0D12",

  /** Surface — #121418 */
  surface: "#121418",

  /** Anthracite — #1A1D24 */
  anthracite: "#1A1D24",

  /** Blanc Piste — #F4F4F4 */
  piste: "#F4F4F4",

  /** Gris Titane — #5F6673 */
  titane: "#5F6673",

  /** Glass surface */
  glass: "rgba(26, 29, 36, 0.85)",

  /** Borders */
  border: "rgba(255, 255, 255, 0.08)",
  borderHover: "rgba(255, 255, 255, 0.15)",
} as const;

/* ------------------------------------------------
   BRAND ASSETS — official Pronokif v1 logo kit
   ------------------------------------------------ */
const brandAssetsBase = "/brand/pronokif-v1";

export const brandAssets = {
  version: "pronokif-v1",

  /** App tile icon: favicon, PWA, splash compact. */
  icon: "/icons/icon-512.png",
  appIconSourcePng: `${brandAssetsBase}/logo-pronokif-app-icon.png`,
  iconSourceSvg: `${brandAssetsBase}/logo-pronokif-icone-black-red.svg`,
  iconSourcePng: `${brandAssetsBase}/logo-pronokif-icone-black-red.png`,

  /** Horizontal wordmark for light backgrounds. */
  wordmarkBlackRed: `${brandAssetsBase}/logo-pronokif-markdown-black-red.svg`,
  wordmarkBlackRedPng: `${brandAssetsBase}/logo-pronokif-markdown-black-red.png`,

  /** Horizontal wordmark for dark app surfaces. */
  wordmarkWhiteRed: `${brandAssetsBase}/logo-pronokif-markdown-white-red.svg`,
  wordmarkWhiteRedPng: `${brandAssetsBase}/logo-pronokif-markdown-white-red.png`,

  /** Standalone symbol without app tile. */
  symbolBlackRed: `${brandAssetsBase}/logo-pronokif-symbole-black-red.svg`,
  symbolBlackRedPng: `${brandAssetsBase}/logo-pronokif-symbole-black-red.png`,
  symbolWhiteRed: `${brandAssetsBase}/logo-pronokif-symbole-white-red.svg`,
  symbolWhiteRedPng: `${brandAssetsBase}/logo-pronokif-symbole-white-red.png`,

  favicon16: "/icons/favicon-16.png",
  favicon32: "/icons/favicon-32.png",
  appleTouchIcon: "/icons/apple-touch-icon.png",
  pwaIcon192: "/icons/icon-192.png",
  pwaIcon512: "/icons/icon-512.png",
} as const;

/* ------------------------------------------------
   SEMANTIC COLORS
   ------------------------------------------------ */
export const semantic = {
  success: "#10b981",
  warning: "#f59e0b",
  error: "#DC2626",
  info: "#3b82f6",
} as const;

/* ------------------------------------------------
   PODIUM — Top 3 classement
   ------------------------------------------------ */
export const podium = {
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
} as const;

/* ------------------------------------------------
   F1 TEAM COLORS (2026 season)
   Used for team-strip borders in live race & pronostics
   ------------------------------------------------ */
export const teamColors: Record<string, string> = {
  "red-bull": "#3671C6",
  mercedes: "#27F4D2",
  ferrari: "#E8002D",
  mclaren: "#FF8000",
  "aston-martin": "#229971",
  alpine: "#FF87BC",
  williams: "#64C4FF",
  haas: "#B6BABD",
  rb: "#6692FF",
  sauber: "#52E252",
} as const;

/* ------------------------------------------------
   TYPOGRAPHY
   ------------------------------------------------ */
export const fonts = {
  display: '"Racing Sans One", sans-serif',
  body: '"Chivo", sans-serif',
  data: '"JetBrains Mono", monospace',
} as const;

export const fontSizes = {
  heroXl: "clamp(3rem, 8vw, 6rem)",
  hero: "2rem",
  h2: "1.375rem",
  h3: "1.125rem",
  body: "0.9375rem",
  caption: "0.6875rem",
  dataLg: "clamp(2rem, 4vw, 3rem)",
  data: "0.875rem",
} as const;

/* ------------------------------------------------
   SPACING — base 4px
   ------------------------------------------------ */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

/* ------------------------------------------------
   BORDER RADIUS
   ------------------------------------------------ */
export const radii = {
  sm: "2px",
  md: "6px",
  lg: "12px",
  xl: "16px",
  pill: "9999px",
} as const;

/* ------------------------------------------------
   Z-INDEX SCALE
   ------------------------------------------------ */
export const zIndex = {
  base: 0,
  card: 1,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  nav: 50,
  toast: 60,
  tooltip: 70,
} as const;
