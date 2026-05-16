import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Pronokif.
 *
 * Assumes:
 * - Backend running on http://localhost:8000
 * - Frontend dev server on http://localhost:3000
 *
 * Run: npx playwright test
 * UI:  npx playwright test --ui
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec/,
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
      },
      testMatch: /mobile\.spec/,
    },
  ],

  webServer: {
    command: "npx vite --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
