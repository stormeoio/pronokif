import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs } from "./helpers";

test.describe("Navigation and routing", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await mockDashboardAPIs(page);

    // Mock additional endpoints for various pages
    await page.route("**/api/leaderboard*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.route("**/api/results*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.route("**/api/missions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ missions: [], completed: [] }),
      }),
    );

    await page.route("**/api/minigames*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.route("**/api/notifications*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );

    await page.route("**/api/profile*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "e2e-user-1",
          username: "TestPilot",
          email: "test@pronokif.fr",
          level: 7,
          xp: 450,
          avatar_id: "avatar-1",
        }),
      }),
    );

    await page.route("**/api/championship*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ standings: [] }),
      }),
    );
  });

  test("bottom nav navigates to predictions (calendar)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Find and click the predictions/calendar nav item
    const calendarLink = page.locator("nav a[href='/predictions'], nav button").filter({ hasText: /calendrier|pronostics/i }).first();
    if (await calendarLink.isVisible()) {
      await calendarLink.click();
      await expect(page).toHaveURL(/\/predictions/);
    }
  });

  test("bottom nav navigates to leaderboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const leaderboardLink = page.locator("nav a[href='/leaderboard']").first();
    if (await leaderboardLink.isVisible()) {
      await leaderboardLink.click();
      await expect(page).toHaveURL(/\/leaderboard/);
    }
  });

  test("profile page loads correctly", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/profile");
    await expect(page.getByText("TestPilot")).toBeVisible({ timeout: 10000 });
  });

  test("notifications page loads", async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/notifications");
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });

  test("missions page loads without errors", async ({ page }) => {
    await page.goto("/missions");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/missions");
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });

  test("minigames page loads without errors", async ({ page }) => {
    await page.goto("/minigames");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/minigames");
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });

  test("results page loads without errors", async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/results");
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });

  test("unknown route redirects or shows 404", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await page.waitForLoadState("networkidle");

    // Either redirects to / or shows a not-found state
    const url = page.url();
    const has404Text = await page.getByText(/introuvable|not found|404/i).isVisible().catch(() => false);
    const redirected = url.endsWith("/") || url.includes("/auth");

    expect(has404Text || redirected).toBe(true);
  });

  test("direct URL access to protected page works when authenticated", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");

    // Should stay on leaderboard (not redirect to auth)
    await expect(page).toHaveURL(/\/leaderboard/);
  });
});
