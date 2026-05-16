/**
 * TanStack Query client — shared across the app.
 *
 * Imported by App.tsx (wraps <QueryClientProvider>) and by any module
 * that needs to invalidate or prefetch outside of React (rare).
 */
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 s — F1 data doesn't change every second
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
