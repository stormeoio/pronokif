/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Pronokif frontend — Vite config.
 *
 * Replaces the previous CRA + craco setup. Behaviour goals:
 *   - Same dev URL (http://localhost:3000) and same path alias (`@/`)
 *     so contributors don't have to re-learn anything.
 *   - Vite reads VITE_* env vars from frontend/.env (REACT_APP_*
 *     are no longer exposed; see migration note below).
 *   - Production build emits to ./build, not ./dist, so Docker/Nginx
 *     image stages keep working unchanged.
 *
 * Env migration: REACT_APP_BACKEND_URL -> VITE_BACKEND_URL.
 *   Vite only exposes vars prefixed VITE_ to the bundle. The single
 *   call site in src/App.js was updated in the same commit.
 */
export default defineConfig(({ mode }) => {
  // loadEnv() is here only so the config itself can introspect env;
  // browser-side access still goes through `import.meta.env`.
  loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      open: false,
    },
    preview: {
      port: 3000,
    },
    build: {
      outDir: "build",
      sourcemap: true,
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        exclude: [
          "**/*.d.ts",
          "src/main.tsx",
          "src/components/ui/**",
        ],
      },
    },
  };
});
