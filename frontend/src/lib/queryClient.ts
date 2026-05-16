/**
 * TanStack Query client — shared across the app.
 *
 * Imported by App.tsx (wraps <QueryClientProvider>) and by any module
 * that needs to invalidate or prefetch outside of React (rare).
 *
 * Cache strategy:
 * - staleTime 30s: data re-fetches in background after 30s (not blocking)
 * - gcTime 5min: inactive cache entries cleaned after 5 minutes
 * - refetchOnWindowFocus disabled: avoids extra requests on tab switch
 * - retry 1: single retry on network errors
 *
 * Per-query overrides for longer-lived data (avatars, championship):
 *   staleTime: 5 * 60_000 (5 min)
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s — F1 data doesn't change every second
      gcTime: 5 * 60_000, // 5min — keep cache for quick back-navigation
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0, // mutations should not auto-retry
    },
  },
});
