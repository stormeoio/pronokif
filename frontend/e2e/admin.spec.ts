import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs } from "./helpers";

const ADMIN_USER = {
  id: "e2e-user-1",
  email: "admin@pronokif.fr",
  username: "AdminPilot",
  avatar_id: "avatar-1",
  current_league_id: "league-1",
  is_admin: true,
};

const TEST_MEMBERS = [
  { id: 1, username: "SpeedKing", email: "speed@test.fr", level: 5, predictions_count: 12 },
  { id: 2, username: "RaceQueen", email: "queen@test.fr", level: 3, predictions_count: 8 },
  { id: 3, username: null, email: "newbie@test.fr", level: 1, predictions_count: 0 },
];

const TEST_FEEDBACK = [
  { id: 1, username: "SpeedKing", category: "bug", message: "Le classement ne se met pas a jour", read: false, created_at: "2026-05-10T14:00:00Z" },
  { id: 2, username: "RaceQueen", category: "suggestion", message: "Ajouter un mode sombre", read: true, created_at: "2026-05-09T10:30:00Z" },
];

test.describe("Admin panel", () => {
  test.beforeEach(async ({ page }) => {
    // Admin-specific auth mock
    await page.addInitScript((user) => {
      localStorage.setItem("token", "e2e-fake-jwt-token");
      localStorage.setItem("user", user);
    }, JSON.stringify(ADMIN_USER));

    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ADMIN_USER),
      }),
    );

    await mockDashboardAPIs(page);

    // Admin endpoints
    await page.route("**/api/admin/members", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_MEMBERS),
      }),
    );

    await page.route("**/api/admin/feedback", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_FEEDBACK),
      }),
    );

    await page.route("**/api/admin/races*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    );
  });

  test("admin page loads with tab navigation", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/admin");
    // Should not show error boundary
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });

  test("members tab shows member list", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Click members tab if not default
    const membersTab = page.getByText("Membres").first();
    if (await membersTab.isVisible()) {
      await membersTab.click();
    }

    await expect(page.getByText("SpeedKing")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("RaceQueen")).toBeVisible();
    await expect(page.getByText("Sans pseudo")).toBeVisible(); // null username
  });

  test("feedback tab shows messages with categories", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Navigate to feedback tab
    const feedbackTab = page.getByText("Feedback").first();
    if (await feedbackTab.isVisible()) {
      await feedbackTab.click();
    }

    await expect(page.getByText("Le classement ne se met pas a jour")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Bug")).toBeVisible();
    await expect(page.getByText("Suggestion")).toBeVisible();
  });

  test("notification form validates required fields", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Navigate to notifications tab
    const notifTab = page.getByText("Notifications").first();
    if (await notifTab.isVisible()) {
      await notifTab.click();
    }

    // Send button should be disabled when fields are empty
    const sendBtn = page.getByRole("button", { name: /envoyer/i });
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await expect(sendBtn).toBeDisabled();
  });

  test("notification send button enables when form is filled", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const notifTab = page.getByText("Notifications").first();
    if (await notifTab.isVisible()) {
      await notifTab.click();
    }

    // Fill title and message
    await page.locator("#notif-title").fill("Test notification");
    await page.locator("#notif-message").fill("Ceci est un test");

    // Send button should now be enabled
    const sendBtn = page.getByRole("button", { name: /envoyer/i });
    await expect(sendBtn).toBeEnabled();
  });
});
