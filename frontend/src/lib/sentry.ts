/**
 * Sentry error monitoring initialization.
 *
 * Only activates when VITE_SENTRY_DSN is set (production).
 * In dev mode, errors stay in the console as usual.
 */
import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    release: `pronokif-frontend@${import.meta.env.VITE_APP_VERSION ?? "dev"}`,

    // Performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Session replay for debugging (1% in prod, 100% on errors)
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

    // Don't send PII
    sendDefaultPii: false,

    // Ignore common non-actionable errors
    ignoreErrors: [
      "ResizeObserver loop",
      "Network Error",
      "AbortError",
      "TypeError: Failed to fetch",
      "TypeError: Load failed",
      "TypeError: NetworkError",
      "ChunkLoadError",
    ],

    beforeSend(event) {
      // Strip any token from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.data?.url) {
            bc.data.url = bc.data.url.replace(/token=[^&]+/, "token=***");
          }
          return bc;
        });
      }
      return event;
    },
  });
}

/**
 * Identify the current user in Sentry (call after login).
 */
export function setSentryUser(user: { id: string; username?: string } | null) {
  if (!DSN) return;
  if (user) {
    Sentry.setUser({ id: user.id, username: user.username });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Report a handled error to Sentry with optional context.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!DSN) {
    console.error("[Sentry disabled]", error, context);
    return;
  }
  Sentry.captureException(error, { extra: context });
}
