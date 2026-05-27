/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
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
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "icons/favicon-pronokif-v1-16.png",
          "icons/favicon-pronokif-v1-32.png",
          "icons/apple-touch-icon-pronokif-v1.png",
          "icons/icon-pronokif-v1-192.png",
          "icons/icon-pronokif-v1-512.png",
        ],
        manifest: {
          name: "PronoKif - Pronostics F1",
          short_name: "PronoKif",
          description: "Jeu de pronostics Formule 1 entre amis",
          start_url: "/",
          display: "standalone",
          background_color: "#0B0D12",
          theme_color: "#0B0D12",
          lang: "fr",
          orientation: "portrait",
          icons: [
            {
              src: "/icons/icon-pronokif-v1-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-pronokif-v1-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
          ],
          categories: ["games", "sports"],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          globIgnores: ["**/logo-pronokif-icone-black-red.svg"],
          navigateFallback: "/index.html",
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\/api\//,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: /^https:\/\/static\.prod-images\./,
              handler: "CacheFirst",
              options: {
                cacheName: "static-images",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
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
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/three/")) return "three-core";
            if (id.includes("@react-three/fiber")) return "three-fiber";
            if (id.includes("@react-three/drei")) return "three-drei";
            if (id.includes("framer-motion")) return "framer";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("@tanstack/react-query")) return "query";
            if (id.includes("react-router-dom") || id.includes("@remix-run")) return "router";
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx,js,jsx}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "**/*.d.ts",
          "src/main.tsx",
          "src/test/**",
          "src/components/ui/**",
          "src/types/**",
        ],
      },
    },
  };
});
