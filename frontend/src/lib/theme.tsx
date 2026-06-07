/**
 * Theme provider — persistent dark/light mode for the public app.
 *
 * The Broadcast Premium identity is dark by default. Users can opt into a
 * light theme from their profile; the choice is stored in localStorage and
 * applied as `data-theme="light"` on <html> so it covers EVERY route (the
 * light-palette overrides live in index.css, shared with the admin BO).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pronokif:theme";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* non-critical */
  }
  return "dark";
}

/** Apply the theme to <html> so all routes (and portals) pick it up. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  root.style.colorScheme = theme;
}

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // Apply + persist on every change (and on mount).
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* non-critical */
    }
  }, [theme]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggle = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark: theme === "dark", setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
