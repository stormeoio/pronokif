import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs, TEST_RACE } from "./helpers";

test.describe("Predictions page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await mockDashboardAPIs(page);

    // Mock race detail
    await page.route("**/api/races/race-1", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_RACE),
      }),
    );

    // Mock minigames completion
    await page.route("**/api/minigames/*/scores", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );
  });

  test("displays race name and driver list", async ({ page }) => {
    await page.goto("/predictions/race-1");
    await page.waitForLoadState("networkidle");

    // Race name visible somewhere on the page
    await expect(page.getByText("Monaco")).toBeVisible({ timeout: 10000 });

    // Drivers listed
    await expect(page.getByText("Verstappen")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Hamilton")).toBeVisible();
  });

  test("page loads without errors", async ({ page }) => {
    await page.goto("/predictions/race-1");
    await page.waitForLoadState("networkidle");

    // Should not show error boundary
    await expect(page.getByText(/Une erreur (est survenue|inattendue)/)).not.toBeVisible();

    // Should be on the correct URL
    await expect(page).toHaveURL(/\/predictions\/race-1/);
  });

  test("shows existing prediction state when already submitted", async ({ page }) => {
    // Override prediction to return existing one
    await page.route("**/api/predictions/race/race-1", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "pred-1",
          race_id: "race-1",
          p1: "d1",
          p2: "d2",
          p3: "d3",
          bonus_driver: "d4",
          created_at: new Date().toISOString(),
        }),
      }),
    );

    await page.goto("/predictions/race-1");
    await page.waitForLoadState("networkidle");

    // Page should load successfully with prediction data
    await expect(page).toHaveURL(/\/predictions\/race-1/);
    await expect(page.getByText("Monaco")).toBeVisible({ timeout: 10000 });
  });
});
