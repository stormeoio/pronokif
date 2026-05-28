/**
 * i18n configuration for PronoKif.
 *
 * Detection order:
 * 1. User preference stored in localStorage ("pronokif:locale")
 * 2. User profile locale from backend (once authenticated)
 * 3. Browser language (navigator.language)
 * 4. Default: "fr"
 *
 * Francophone languages (fr, fr-FR, fr-BE, fr-CA, fr-CH) → "fr"
 * Everything else → "en"
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import fr from "./fr";
import en from "./en";

export const SUPPORTED_LOCALES = ["fr", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = "pronokif:locale";

/**
 * Resolve a raw language tag to our supported locale.
 * Anything francophone → "fr", everything else → "en".
 */
export function resolveLocale(lang: string | null | undefined): Locale {
  if (!lang) return "fr";
  const lower = lang.toLowerCase();
  if (lower === "fr" || lower.startsWith("fr-")) return "fr";
  return "en";
}

/** Read persisted locale from localStorage */
export function getStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "fr" || stored === "en") return stored;
  } catch {
    /* blocked storage */
  }
  return null;
}

/** Persist locale choice */
export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* non-critical */
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { fr: { translation: fr }, en: { translation: en } },
    fallbackLng: "fr",
    supportedLngs: ["fr", "en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => resolveLocale(lng),
    },
    react: { useSuspense: false },
  });

export default i18n;
