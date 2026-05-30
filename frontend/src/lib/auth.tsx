/**
 * Auth context, provider, and hooks.
 *
 * Security: authentication is handled via httpOnly cookies set by the backend.
 * No tokens are stored in localStorage (P0-2 fix). Only the user object
 * is cached in localStorage for instant hydration on reload.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiClient } from "@/lib/api";
import { setStoredLocale } from "@/i18n";
import type { Locale } from "@/i18n";

// ------------------------------------------------------------------ types ---

export interface User {
  id: string;
  email: string;
  username?: string;
  current_league_id?: string;
  avatar_id?: string | null;
  custom_avatar_url?: string | null;
  custom_avatar?: string;
  is_admin?: boolean;
  email_verified?: boolean;
  level: number;
  xp: number;
  [key: string]: unknown; // allow extra fields from backend
}

interface SessionResponse {
  user: User | null;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  requestMagicLink: (email: string) => Promise<void>;
  loginWithMagicLink: (token: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    opts?: { username?: string; locale?: string; nationality?: string; inviteToken?: string },
  ) => Promise<User>;
  logout: () => Promise<void>;
  setUsername: (username: string) => Promise<User>;
  updateUser: (updates: Partial<User>) => void;
  resendVerification: () => Promise<void>;
}

// --------------------------------------------------------------- context ---

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// --------------------------------------------------------------- provider ---

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { i18n } = useTranslation();

  /** Sync i18n language when a user's locale preference is known. */
  const syncLocale = useCallback(
    (u: Record<string, unknown>) => {
      const locale = (u.locale as string) || "fr";
      if (locale === "fr" || locale === "en") {
        setStoredLocale(locale as Locale);
        i18n.changeLanguage(locale);
      }
    },
    [i18n],
  );

  // On mount: validate session without emitting a 401 for anonymous visitors.
  useEffect(() => {
    // Instant hydration from cached user object (not a token!)
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }

    // Validate session with backend (cookie-based)
    apiClient
      .get<SessionResponse>("/auth/session")
      .then((res) => {
        if (!res.data.user) {
          localStorage.removeItem("user");
          setUser(null);
          return;
        }
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        syncLocale(res.data.user);
      })
      .catch(() => {
        // No valid session — clear cached user
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [syncLocale]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post("/auth/login", { email, password });
    // Backend sets httpOnly cookies — we only cache the user object
    const u = res.data.user;
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    syncLocale(u);
    return u;
  };

  const requestMagicLink = async (email: string): Promise<void> => {
    await apiClient.post("/auth/magic-link", { email });
  };

  const loginWithMagicLink = async (token: string): Promise<User> => {
    const res = await apiClient.post("/auth/magic-link/verify", { token });
    const u = res.data.user;
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    syncLocale(u);
    return u;
  };

  const register = async (
    email: string,
    password: string,
    opts?: { username?: string; locale?: string; nationality?: string; inviteToken?: string },
  ): Promise<User> => {
    const res = await apiClient.post("/auth/register", {
      email,
      password,
      username: opts?.username,
      locale: opts?.locale,
      nationality: opts?.nationality,
      invite_token: opts?.inviteToken,
    });
    const u = res.data.user;
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    syncLocale(u);
    return u;
  };

  const setUsername = async (username: string): Promise<User> => {
    const res = await apiClient.post("/auth/username", { username });
    setUser(res.data);
    localStorage.setItem("user", JSON.stringify(res.data));
    return res.data;
  };

  const logout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore errors — we clear state regardless
    }
    localStorage.removeItem("user");
    setUser(null);
  };

  const resendVerification = async () => {
    await apiClient.post("/auth/resend-verification");
  };

  const updateUser = (updates: Partial<User>) => {
    const newUser = { ...user, ...updates } as User;
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        requestMagicLink,
        loginWithMagicLink,
        register,
        logout,
        setUsername,
        updateUser,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// --------------------------------------------------------- route guards ---

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
