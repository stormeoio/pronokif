/**
 * Root application component — providers + layout shell.
 *
 * Route definitions live in routes.tsx (extracted Sprint 4).
 * This file is pure orchestration: providers + layout + suspense.
 */
import { Suspense } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppRouter, PageLoader } from "@/routes";
import BottomNav from "@/components/BottomNav";
import "@/App.css";

// ------------------------------------------------------------------ layout ---

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideNav = ["/auth", "/set-username"].includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-safe"} role="main">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </ErrorBoundary>
      </main>
      {!hideNav && <BottomNav />}
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
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "#121214",
                  color: "#fafafa",
                  border: "1px solid rgba(255,255,255,0.1)",
                },
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
