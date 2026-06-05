/**
 * useAdminTheme — Dark/light theme toggle for the admin back-office.
 *
 * The public-facing app stays dark-only (Broadcast Premium identity).
 * The admin BO gets a light option for readability during long editing
 * sessions. The theme is stored in localStorage and applied as a CSS
 * class on a wrapper div (not on <html>, to avoid polluting the public app).
 *
 * Usage:
 *   const { theme, toggle, isDark } = useAdminTheme();
 *   <div className={theme === "light" ? "admin-light" : ""}>
 */

import { useCallback, useEffect, useState } from "react";

export type AdminTheme = "dark" | "light";

const STORAGE_KEY = "pronokif:admin-theme";

function getStoredTheme(): AdminTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* non-critical */
  }
  return "dark";
}

export function useAdminTheme() {
  const [theme, setTheme] = useState<AdminTheme>(getStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* non-critical */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return {
    theme,
    toggle,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}
