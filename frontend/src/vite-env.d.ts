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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
