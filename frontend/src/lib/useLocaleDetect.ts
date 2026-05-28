/**
 * Hook that runs once on app load to detect the user's locale.
 *
 * Detection flow:
 * 1. If a locale is already stored (user chose manually or from profile), use it.
 * 2. Otherwise, call /auth/geolocate to get the user's country from IP.
 * 3. If the country is francophone → "fr", else → "en".
 * 4. Also returns the detected country_code for pre-filling the nationality field.
 *
 * The result is persisted in localStorage so the API is only called once.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/lib/api";
import { FRANCOPHONE_COUNTRIES } from "@/i18n/countries";
import { getStoredLocale, resolveLocale, setStoredLocale } from "@/i18n";
import type { Locale } from "@/i18n";

const GEO_CACHE_KEY = "pronokif:geo-country";

interface GeoState {
  locale: Locale;
  countryCode: string | null;
  ready: boolean;
}

function getCachedCountry(): string | null {
  try {
    return localStorage.getItem(GEO_CACHE_KEY);
  } catch {
    return null;
  }
}

function cacheCountry(code: string): void {
  try {
    localStorage.setItem(GEO_CACHE_KEY, code);
  } catch {
    /* non-critical */
  }
}

export function useLocaleDetect(): GeoState {
  const { i18n } = useTranslation();
  const [state, setState] = useState<GeoState>({
    locale: (getStoredLocale() ?? resolveLocale(navigator.language)) as Locale,
    countryCode: getCachedCountry(),
    ready: !!getStoredLocale(),
  });

  useEffect(() => {
    // If the user already has a stored locale preference, skip geolocation
    if (getStoredLocale()) {
      setState((prev) => ({ ...prev, ready: true }));
      return;
    }

    // Check if we already have a cached geolocation result
    const cached = getCachedCountry();
    if (cached) {
      const locale = FRANCOPHONE_COUNTRIES.has(cached) ? "fr" : "en";
      setStoredLocale(locale);
      i18n.changeLanguage(locale);
      setState({ locale, countryCode: cached, ready: true });
      return;
    }

    // Call the geolocation API
    let cancelled = false;
    apiClient
      .get<{ country_code: string; country: string }>("/auth/geolocate")
      .then((res) => {
        if (cancelled) return;
        const code = res.data.country_code || "FR";
        cacheCountry(code);
        const locale = FRANCOPHONE_COUNTRIES.has(code) ? "fr" : "en";
        setStoredLocale(locale);
        i18n.changeLanguage(locale);
        setState({ locale, countryCode: code, ready: true });
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback to browser language detection
        const locale = resolveLocale(navigator.language);
        setStoredLocale(locale);
        i18n.changeLanguage(locale);
        setState({ locale, countryCode: null, ready: true });
      });

    return () => {
      cancelled = true;
    };
  }, [i18n]);

  return state;
}
