/// <reference types="vite/client" />

/**
 * Augment ImportMetaEnv with the variables Pronokif actually reads from
 * the browser. Keep this in sync with frontend/.env.example. Vite only
 * exposes vars prefixed VITE_ to the bundle.
 */
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
  // DEV-only quick-login (5 taps on the login logo). Defaults to the seeded
  // demo account; only read when import.meta.env.DEV is true.
  readonly VITE_DEV_TEST_EMAIL?: string;
  readonly VITE_DEV_TEST_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
