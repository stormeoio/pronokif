import { test, expect } from "@playwright/test";
import { mockDashboardAPIs } from "./helpers";

const ADMIN_USER = {
  id: "e2e-user-1",
  email: "admin@pronokif.fr",
  username: "AdminPilot",
  avatar_id: "avatar-1",
  current_league_id: "league-1",
  is_admin: true,
  level: 9,
  xp: 900,
};

const TEST_MEMBERS = [
  {
    id: "1",
    username: "SpeedKing",
    email: "speed@test.fr",
    level: 5,
    xp: 1200,
    created_at: "2026-05-10T14:00:00Z",
  },
  {
    id: "2",
    username: "RaceQueen",
    email: "queen@test.fr",
    level: 3,
    xp: 800,
    created_at: "2026-05-09T10:30:00Z",
  },
  {
    id: "3",
    username: null,
    email: "newbie@test.fr",
    level: 1,
    xp: 0,
    created_at: "2026-05-08T10:30:00Z",
  },
];

const TEST_FEEDBACK = [
  {
    id: "1",
    username: "SpeedKing",
    user_id: "1",
    category: "bug",
    message: "Le classement ne se met pas a jour",
    read: false,
    created_at: "2026-05-10T14:00:00Z",
  },
  {
    id: "2",
    username: "RaceQueen",
    user_id: "2",
    category: "suggestion",
    message: "Ajouter un mode sombre",
    read: true,
    created_at: "2026-05-09T10:30:00Z",
  },
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

    await page.route("**/api/admin-bo/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ email: ADMIN_USER.email }),
      }),
    );

    await page.route("**/api/admin-bo/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total_users: TEST_MEMBERS.length,
          total_predictions: 12,
          total_leagues: 2,
          total_races: 24,
          unread_feedbacks: 1,
          pending_invitations: 1,
          new_users_week: 3,
        }),
      }),
    );

    await page.route("**/api/admin-bo/users*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: TEST_MEMBERS, total: TEST_MEMBERS.length }),
      }),
    );

    await page.route("**/api/admin-bo/feedbacks*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ feedbacks: TEST_FEEDBACK, total: TEST_FEEDBACK.length }),
      }),
    );

    await page.route("**/api/admin-bo/invitations/batch", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sent: 1, skipped: [], failed: [] }),
      }),
    );

    await page.route("**/api/admin-bo/invitations", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "inv-2", email: "new@test.fr" }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "inv-1",
            email: "future@test.fr",
            sent_by: ADMIN_USER.email,
            accepted: false,
            created_at: "2026-05-10T14:00:00Z",
            expires_at: "2026-06-10T14:00:00Z",
          },
        ]),
      });
    });
  });

  test("admin page loads with tab navigation", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/admin");
    // Should not show error boundary
    await expect(page.getByText(/incident en piste/i)).not.toBeVisible();
  });

  test("users tab shows member list", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await page.locator("aside nav").getByRole("button", { name: "Users", exact: true }).click();

    await expect(page.getByText("SpeedKing")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("RaceQueen")).toBeVisible();
    await expect(page.getByText("not set")).toBeVisible(); // null username
  });

  test("feedbacks tab shows messages with categories", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await page.locator("aside nav").getByRole("button", { name: "Feedbacks", exact: true }).click();

    await expect(page.getByText("Le classement ne se met pas a jour")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Bug")).toBeVisible();
    await expect(page.getByText("Suggestion")).toBeVisible();
  });

  test("invitation form validates required fields", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await page
      .locator("aside nav")
      .getByRole("button", { name: "Invitations", exact: true })
      .click();

    const sendBtn = page.getByRole("button", { name: /send invitation/i });
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await expect(sendBtn).toBeDisabled();
  });

  test("invitation send button enables when form is filled", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await page
      .locator("aside nav")
      .getByRole("button", { name: "Invitations", exact: true })
      .click();

    await page.getByPlaceholder("email.com").fill("new@test.fr");

    const sendBtn = page.getByRole("button", { name: /send invitation/i });
    await expect(sendBtn).toBeEnabled();
  });
});
