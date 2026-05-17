/**
 * Root application component — providers + layout shell.
 *
 * Route definitions live in routes.tsx (extracted Sprint 4).
 * This file is pure orchestration: providers + layout + suspense + 3D background.
 */
import { Suspense, lazy } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppRouter } from "@/routes";
import AnimatedBottomNav from "@/components/AnimatedBottomNav";
import NetworkStatus from "@/components/NetworkStatus";
import ScrollToTop from "@/components/ScrollToTop";
import PageTransition from "@/components/PageTransition";
import "@/App.css";

// Lazy-load heavy 3D components for performance
const ParticleBackground = lazy(() => import("@/components/three/ParticleBackground"));
const LoadingScene = lazy(() => import("@/components/three/LoadingScene"));

// ------------------------------------------------------------------ layout ---

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideNav = ["/auth", "/set-username"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Aller au contenu principal
      </a>

      {/* 3D particle background (ambient, low perf cost) */}
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>

      {/* Main content with page transitions */}
      <main id="main-content" className={`relative z-10 ${hideNav ? "" : "pb-safe"}`} role="main">
        <ErrorBoundary key={location.pathname}>
          <Suspense
            fallback={
              <Suspense fallback={<FallbackLoader />}>
                <LoadingScene />
              </Suspense>
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
      <div className="w-12 h-12 rounded-full border-3 border-orange-500/30 border-t-orange-500 animate-spin" />
    </div>
  );
}

// --------------------------------------------------------------------- app ---

export default function App() {
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
                    background: "#121214",
                    color: "#fafafa",
                    border: "1px solid rgba(255,255,255,0.1)",
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
