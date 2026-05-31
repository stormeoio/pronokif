import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiClient } from "@/lib/api";
import { brandAssets } from "@/lib/brand";

export interface BrandingSettings {
  app_name: string;
  primary_color: string;
  accent_color: string;
  logo_url: string;
  wordmark_dark_url: string;
  wordmark_light_url: string;
  symbol_dark_url: string;
  symbol_light_url: string;
  app_icon_url: string;
  favicon_url: string;
  apple_touch_icon_url: string;
  pwa_icon_192_url: string;
  pwa_icon_512_url: string;
}

interface BrandAssets {
  wordmarkDark: string;
  wordmarkLight: string;
  symbolDark: string;
  symbolLight: string;
  appIcon: string;
  favicon: string;
  appleTouchIcon: string;
  pwaIcon192: string;
  pwaIcon512: string;
}

interface BrandingContextValue {
  settings: BrandingSettings;
  assets: BrandAssets;
  refresh: () => Promise<BrandingSettings>;
}

const APP_NAME = "PronoKif";
export const BRANDING_UPDATED_EVENT = "pronokif:branding-updated";
let dynamicManifestUrl: string | null = null;

export const DEFAULT_BRANDING: BrandingSettings = {
  app_name: APP_NAME,
  primary_color: "#E10600",
  accent_color: "#f59e0b",
  logo_url: brandAssets.wordmarkWhiteRed,
  wordmark_dark_url: brandAssets.wordmarkWhiteRed,
  wordmark_light_url: brandAssets.wordmarkBlackRed,
  symbol_dark_url: brandAssets.symbolWhiteRed,
  symbol_light_url: brandAssets.symbolBlackRed,
  app_icon_url: brandAssets.pwaIcon512,
  favicon_url: brandAssets.favicon32,
  apple_touch_icon_url: brandAssets.appleTouchIcon,
  pwa_icon_192_url: brandAssets.pwaIcon192,
  pwa_icon_512_url: brandAssets.pwaIcon512,
};

const BrandingContext = createContext<BrandingContextValue>({
  settings: DEFAULT_BRANDING,
  assets: brandingAssetsFromSettings(DEFAULT_BRANDING),
  refresh: async () => DEFAULT_BRANDING,
});

function valueOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeHexColor(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  const hex = raw.startsWith("#") ? raw.slice(1) : raw;

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex.toUpperCase()}`;
  }

  return fallback;
}

export function normalizeBranding(input?: Partial<BrandingSettings> | null): BrandingSettings {
  const settings = input ?? {};

  return {
    app_name: APP_NAME,
    primary_color: normalizeHexColor(settings.primary_color, DEFAULT_BRANDING.primary_color),
    accent_color: normalizeHexColor(settings.accent_color, DEFAULT_BRANDING.accent_color),
    logo_url: valueOrFallback(settings.logo_url, DEFAULT_BRANDING.logo_url),
    wordmark_dark_url: valueOrFallback(
      settings.wordmark_dark_url,
      DEFAULT_BRANDING.wordmark_dark_url,
    ),
    wordmark_light_url: valueOrFallback(
      settings.wordmark_light_url,
      DEFAULT_BRANDING.wordmark_light_url,
    ),
    symbol_dark_url: valueOrFallback(settings.symbol_dark_url, DEFAULT_BRANDING.symbol_dark_url),
    symbol_light_url: valueOrFallback(settings.symbol_light_url, DEFAULT_BRANDING.symbol_light_url),
    app_icon_url: valueOrFallback(settings.app_icon_url, DEFAULT_BRANDING.app_icon_url),
    favicon_url: valueOrFallback(settings.favicon_url, DEFAULT_BRANDING.favicon_url),
    apple_touch_icon_url: valueOrFallback(
      settings.apple_touch_icon_url,
      DEFAULT_BRANDING.apple_touch_icon_url,
    ),
    pwa_icon_192_url: valueOrFallback(settings.pwa_icon_192_url, DEFAULT_BRANDING.pwa_icon_192_url),
    pwa_icon_512_url: valueOrFallback(settings.pwa_icon_512_url, DEFAULT_BRANDING.pwa_icon_512_url),
  };
}

export function brandingAssetsFromSettings(settings: BrandingSettings): BrandAssets {
  return {
    wordmarkDark: settings.wordmark_dark_url || settings.logo_url,
    wordmarkLight: settings.wordmark_light_url,
    symbolDark: settings.symbol_dark_url,
    symbolLight: settings.symbol_light_url,
    appIcon: settings.app_icon_url,
    favicon: settings.favicon_url,
    appleTouchIcon: settings.apple_touch_icon_url,
    pwaIcon192: settings.pwa_icon_192_url,
    pwaIcon512: settings.pwa_icon_512_url,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex, DEFAULT_BRANDING.primary_color).slice(1);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (value: number) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function mixRgb(
  color: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  weight: number,
) {
  return {
    r: Math.round(color.r * (1 - weight) + target.r * weight),
    g: Math.round(color.g * (1 - weight) + target.g * weight),
    b: Math.round(color.b * (1 - weight) + target.b * weight),
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): string {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case red:
        h = (green - blue) / delta + (green < blue ? 6 : 0);
        break;
      case green:
        h = (blue - red) / delta + 2;
        break;
      default:
        h = (red - green) / delta + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function rgbTriplet({ r, g, b }: { r: number; g: number; b: number }): string {
  return `${r} ${g} ${b}`;
}

function rgba({ r, g, b }: { r: number; g: number; b: number }, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function setLinkHref(selector: string, href: string, create?: { rel: string; sizes?: string }) {
  if (!href) return;

  let link = document.querySelector<HTMLLinkElement>(selector);
  if (!link && create) {
    link = document.createElement("link");
    link.rel = create.rel;
    if (create.sizes) link.sizes = create.sizes;
    document.head.appendChild(link);
  }

  if (link) {
    link.href = href;
  }
}

function updateManifest(settings: BrandingSettings) {
  const manifest = {
    id: "/",
    name: `${APP_NAME} - Pronostics F1`,
    short_name: APP_NAME,
    description: "Jeu de pronostics Formule 1 entre amis, ligues privées et back-office.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    background_color: "#0B0D12",
    theme_color: "#0B0D12",
    lang: "fr",
    orientation: "portrait",
    icons: [
      {
        src: settings.pwa_icon_192_url,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: settings.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: settings.pwa_icon_512_url,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["games", "sports"],
    shortcuts: [
      {
        name: "Back-office",
        short_name: "Admin",
        description: "Ouvrir la Direction de Course",
        url: "/admin",
        icons: [{ src: settings.pwa_icon_192_url, sizes: "192x192" }],
      },
      {
        name: "Calendrier F1",
        short_name: "Calendrier",
        description: "Voir les courses et pronostics",
        url: "/predictions",
        icons: [{ src: settings.pwa_icon_192_url, sizes: "192x192" }],
      },
      {
        name: "Mentions légales",
        short_name: "Mentions",
        description: "Consulter les informations légales",
        url: "/mentions-legales",
        icons: [{ src: settings.pwa_icon_192_url, sizes: "192x192" }],
      },
    ],
  };

  const nextUrl = URL.createObjectURL(
    new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }),
  );
  setLinkHref('link[rel="manifest"]', nextUrl, { rel: "manifest" });

  if (dynamicManifestUrl) {
    URL.revokeObjectURL(dynamicManifestUrl);
  }
  dynamicManifestUrl = nextUrl;
}

export function applyBranding(input?: Partial<BrandingSettings> | null) {
  if (typeof document === "undefined") return;

  const settings = normalizeBranding(input);
  const primaryRgb = hexToRgb(settings.primary_color);
  const primaryHoverRgb = mixRgb(primaryRgb, { r: 0, g: 0, b: 0 }, 0.16);
  const accentRgb = hexToRgb(settings.accent_color);
  const root = document.documentElement;

  root.style.setProperty("--primary", rgbToHsl(primaryRgb));
  root.style.setProperty("--ring", rgbToHsl(primaryRgb));
  root.style.setProperty("--accent", rgbToHsl(accentRgb));
  root.style.setProperty("--pk-red", settings.primary_color);
  root.style.setProperty("--pk-red-rgb", rgbTriplet(primaryRgb));
  root.style.setProperty("--pk-red-hover", rgbToHex(primaryHoverRgb));
  root.style.setProperty("--pk-red-hover-rgb", rgbTriplet(primaryHoverRgb));
  root.style.setProperty("--pk-red-glow", rgba(primaryRgb, 0.4));
  root.style.setProperty("--pk-red-subtle", rgba(primaryRgb, 0.08));
  root.style.setProperty("--pk-border-active", settings.primary_color);
  root.style.setProperty("--pk-amber", settings.accent_color);
  root.style.setProperty("--pk-amber-rgb", rgbTriplet(accentRgb));

  setLinkHref('link[rel="icon"][sizes="32x32"]', settings.favicon_url, {
    rel: "icon",
    sizes: "32x32",
  });
  setLinkHref('link[rel="icon"][sizes="16x16"]', settings.favicon_url, {
    rel: "icon",
    sizes: "16x16",
  });
  setLinkHref(
    'link[rel="apple-touch-icon"]',
    settings.apple_touch_icon_url || settings.app_icon_url,
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
    },
  );
  updateManifest(settings);
}

export function emitBrandingUpdated(settings?: Partial<BrandingSettings>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT, { detail: settings }));
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_BRANDING);

  const refresh = useCallback(async () => {
    const response = await apiClient.get<Partial<BrandingSettings>>("/settings/branding");
    const next = normalizeBranding(response.data);
    setSettings(next);
    applyBranding(next);
    return next;
  }, []);

  useEffect(() => {
    applyBranding(DEFAULT_BRANDING);
    void refresh().catch(() => {
      applyBranding(DEFAULT_BRANDING);
    });
  }, [refresh]);

  useEffect(() => {
    const handleBrandingUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Partial<BrandingSettings> | undefined>).detail;
      if (detail) {
        const next = normalizeBranding(detail);
        setSettings(next);
        applyBranding(next);
        return;
      }
      void refresh().catch(() => undefined);
    };

    window.addEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated);
    return () => window.removeEventListener(BRANDING_UPDATED_EVENT, handleBrandingUpdated);
  }, [refresh]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      settings,
      assets: brandingAssetsFromSettings(settings),
      refresh,
    }),
    [refresh, settings],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
