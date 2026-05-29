/**
 * Root application component — providers + layout shell.
 *
 * Route definitions live in routes.tsx (extracted Sprint 4).
 * This file is pure orchestration: providers + layout + suspense + 3D background.
 */
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useLocaleDetect } from "@/lib/useLocaleDetect";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppRouter } from "@/routes";
import AnimatedBottomNav from "@/components/AnimatedBottomNav";
import NetworkStatus from "@/components/NetworkStatus";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import SplashScreen from "@/components/SplashScreen";
import { brandAssets } from "@/lib/brand";
import "@/App.css";

// Lazy-load heavy 3D components for performance
const ParticleBackground = lazy(() => import("@/components/three/ParticleBackground"));
const LoadingScene = lazy(() => import("@/components/three/LoadingScene"));
const SPLASH_SEEN_KEY = "pronokif:splash-seen";

const isAutomatedLocalBrowser = () =>
  window.location.hostname === "localhost" &&
  typeof navigator !== "undefined" &&
  navigator.webdriver;

/** Admin routes have their own video-bg auth page — skip the global splash. */
const isAdminRoute = () =>
  window.location.pathname.startsWith("/admin") ||
  window.location.pathname.startsWith("/admin-bo") ||
  window.location.pathname.startsWith("/bo-admin");

const isPublicLegalRoute = (pathname = window.location.pathname) =>
  pathname.startsWith("/legal/") ||
  ["/mentions-legales", "/cgu", "/conditions-generales-utilisation", "/confidentialite"].includes(
    pathname,
  );

const hasSeenSplash = () => {
  if (isAutomatedLocalBrowser()) return true;
  if (isAdminRoute()) return true;
  if (isPublicLegalRoute()) return true;

  try {
    return window.sessionStorage.getItem(SPLASH_SEEN_KEY) === "true";
  } catch {
    return false;
  }
};

const markSplashSeen = () => {
  try {
    window.sessionStorage.setItem(SPLASH_SEEN_KEY, "true");
  } catch {
    // Non-critical: blocked storage should not trap users on the splash screen.
  }
};

// ------------------------------------------------------------------ layout ---

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { t } = useTranslation();
  const shouldUseLightweightShell = isAutomatedLocalBrowser();
  const isAdminBackOfficeRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/admin-bo") ||
    location.pathname.startsWith("/bo-admin");
  const hideNav =
    isAdminBackOfficeRoute ||
    isPublicLegalRoute(location.pathname) ||
    ["/auth", "/set-username"].includes(location.pathname);
  // Auth pages use their own video background — skip 3D particles to save GPU
  const isAuthRoute = location.pathname === "/auth" || isAdminBackOfficeRoute;

  return (
    <div className="min-h-screen bg-background relative">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-pk-red focus:text-white focus:rounded-md focus:outline-none"
      >
        {t("app.skip_to_content")}
      </a>

      {/* 3D particle background (ambient, low perf cost) — skipped on auth pages (video bg) */}
      {!shouldUseLightweightShell && !isAuthRoute && (
        <Suspense fallback={null}>
          <ParticleBackground />
        </Suspense>
      )}

      {/* Email verification banner (shown for unverified users) */}
      {!hideNav && <EmailVerificationBanner />}

      {/* Main content with page transitions */}
      <main id="main-content" className={`relative z-10 ${hideNav ? "" : "pb-safe"}`} role="main">
        <ErrorBoundary key={location.pathname}>
          <Suspense
            fallback={
              shouldUseLightweightShell ? (
                <FallbackLoader />
              ) : (
                <Suspense fallback={<FallbackLoader />}>
                  <LoadingScene />
                </Suspense>
              )
            }
          >
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Animated bottom navigation */}
      {!hideNav && <AnimatedBottomNav />}

      {/* Network connectivity indicator */}
      <NetworkStatus />

      {/* Scroll to top FAB on long pages */}
      {!hideNav && <ScrollToTop />}
    </div>
  );
}

/** Minimal inline loader before 3D scene loads */
function FallbackLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pk-carbon">
      <div className="w-12 h-12 rounded-full border-3 border-pk-red/25 border-t-pk-red animate-spin shadow-glow-red" />
    </div>
  );
}

// ------------------------------------------------------- app preload hook ---

/**
 * Preload critical resources while the splash screen is shown.
 * Warms auth session, lazy chunks, and 3D background so the app
 * renders instantly when the user taps "Commencer".
 */
function useAppPreload(enabled: boolean): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    Promise.allSettled([
      // Warm auth session + cache user object for AuthProvider instant hydration
      apiClient
        .get("/auth/session")
        .then((res) => {
          if (!res.data.user) return;
          try {
            localStorage.setItem("user", JSON.stringify(res.data.user));
          } catch {
            /* non-critical */
          }
        })
        .catch(() => null),
      // Preload critical lazy-loaded chunks
      import("@/pages/dashboard/DashboardPage").catch(() => null),
      import("@/pages/AuthPage").catch(() => null),
      import("@/components/three/ParticleBackground").catch(() => null),
    ]).then(() => setReady(true));
  }, [enabled]);

  return ready;
}

// --------------------------------------------------------------------- app ---

export default function App() {
  const [hasStarted, setHasStarted] = useState(hasSeenSplash);
  const appReady = useAppPreload(!hasStarted);
  // Detect locale from IP + browser language (runs once, caches result)
  useLocaleDetect();

  const handleSplashStart = useCallback(() => {
    markSplashSeen();
    setHasStarted(true);
  }, []);

  if (!hasStarted) {
    return (
      <SplashScreen
        iconSrc={brandAssets.pwaIcon512}
        wordmarkSrc={brandAssets.wordmarkWhiteRed}
        videoSrc="/video/splash-trailer.mp4"
        introDelayMs={950}
        buttonDelayMs={3600}
        appReady={appReady}
        onComplete={handleSplashStart}
      />
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppLayout>
              <AppRouter />
            </AppLayout>
            <div aria-live="polite" aria-atomic="true">
              <Toaster
                position="top-center"
                toastOptions={{
                  style: {
                    background: "#121418",
                    color: "#F4F4F4",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 14px 38px rgba(0,0,0,0.42), 0 0 20px rgba(225,6,0,0.12)",
                    backdropFilter: "blur(8px)",
                  },
                }}
              />
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
