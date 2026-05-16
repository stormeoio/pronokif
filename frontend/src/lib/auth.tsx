/**
 * Auth context, provider, and hooks.
 *
 * Extracted from App.jsx during Sprint 3 so pages can import `useAuth`
 * without depending on the root App module.
 */
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { apiClient } from "@/lib/api";

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
  level: number;
  xp: number;
  [key: string]: unknown; // allow extra fields from backend
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUsername: (username: string) => Promise<User>;
  updateUser: (updates: Partial<User>) => void;
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      apiClient
        .get("/auth/me")
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (email: string, password: string): Promise<User> => {
    const res = await apiClient.post("/auth/register", { email, password });
    localStorage.setItem("token", res.data.access_token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const setUsername = async (username: string): Promise<User> => {
    const res = await apiClient.post("/auth/username", { username });
    setUser(res.data);
    localStorage.setItem("user", JSON.stringify(res.data));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    const newUser = { ...user, ...updates } as User;
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, setUsername, updateUser }}
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
