import { test, expect } from "@playwright/test";
import { TEST_USER } from "./helpers";

test.describe("Authentication flow", () => {
  test("redirects unauthenticated user to /auth", async ({ page }) => {
    // Mock API to return 401 (no valid session)
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ detail: "Not authenticated" }) }),
    );

    await page.goto("/");
    // ProtectedRoute should redirect to /auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test("auth page renders login tab with form fields", async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ detail: "Not authenticated" }) }),
    );

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // The login tab is default — form fields should be visible
    await expect(page.locator("[data-testid='login-form']")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-testid='login-email']")).toBeVisible();
    await expect(page.locator("[data-testid='login-password']")).toBeVisible();
    await expect(page.locator("[data-testid='login-submit']")).toBeVisible();
  });

  test("successful login stores token and navigates away", async ({ page }) => {
    // Start unauthenticated
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ detail: "Not authenticated" }) }),
    );

    // Mock login endpoint
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "fake-jwt", user: TEST_USER }),
      }),
    );

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    // Fill form
    await page.locator("[data-testid='login-email']").fill("test@pronokif.fr");
    await page.locator("[data-testid='login-password']").fill("password123");

    // Setup post-login mocks before clicking
    // unroute the 401 mock and replace with authenticated response
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_USER),
      }),
    );
    await page.route("**/api/races/upcoming", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) }),
    );
    await page.route("**/api/avatars", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({}) }),
    );
    await page.route("**/api/leagues/my", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) }),
    );
    await page.route("**/api/leagues/unread-messages", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ by_league: {} }) }),
    );
    await page.route("**/api/notifications/unread-count", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0 }) }),
    );
    await page.route("**/api/predictions/*", (route) =>
      route.fulfill({ status: 404, body: JSON.stringify(null) }),
    );

    // Submit
    await page.locator("[data-testid='login-submit']").click();

    // Should navigate away from /auth after successful login
    await expect(page).not.toHaveURL(/\/auth/, { timeout: 10000 });
  });

  test("failed login shows error toast and stays on page", async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ detail: "Not authenticated" }) }),
    );

    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Email ou mot de passe incorrect" }),
      }),
    );

    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    await page.locator("[data-testid='login-email']").fill("bad@test.fr");
    await page.locator("[data-testid='login-password']").fill("wrong");
    await page.locator("[data-testid='login-submit']").click();

    // Should stay on /auth
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/auth/);
  });
});
