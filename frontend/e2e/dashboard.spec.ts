import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs } from "./helpers";

test.describe("Dashboard — authenticated user", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await mockDashboardAPIs(page);
  });

  test("loads dashboard and shows race card", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should land on dashboard (authenticated user with league)
    await expect(page).toHaveURL("/");

    // Race name (after .replace(" Grand Prix", "")) should appear
    await expect(page.getByText("Monaco").first()).toBeVisible({ timeout: 10000 });
  });

  test("bottom navigation is rendered", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // BottomNav component should be present
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test("shows league name", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Our mocked league name
    await expect(page.getByText("Les Pilotes").first()).toBeVisible({ timeout: 10000 });
  });
});
