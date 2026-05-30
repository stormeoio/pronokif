import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs } from "./helpers";

/**
 * Mobile-specific tests — runs in the "mobile" project (iPhone 14 viewport).
 */
test.describe("Mobile experience", () => {
  test.describe("authenticated shell", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsTestUser(page);
      await mockDashboardAPIs(page);
    });

    test("bottom navigation renders on mobile", async ({ page }) => {
      await page.goto("/");
      const nav = page.locator("nav");
      await expect(nav).toBeVisible();
    });

    test("dashboard content fits viewport without horizontal scroll", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(500);

      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);

      // No horizontal overflow
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });

  test("auth page is usable on mobile", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.setItem("pronokif:splash-seen", "true");
    });

    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: null }),
      }),
    );

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator("[data-testid='login-email']");
    await expect(emailInput).toBeVisible({ timeout: 10000 });

    // Input should be reachable (not clipped)
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
  });
});
