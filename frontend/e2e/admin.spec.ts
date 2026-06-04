import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
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

async function selectAdminTab(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name, exact: typeof name === "string" }).click();
}

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

    await page.route("**/api/admin-bo/business/operations", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          summary: {
            business_score: 86,
            attention_count: 1,
            critical_count: 0,
            warning_count: 1,
            info_count: 0,
          },
          generated_at: "2026-05-29T14:00:00Z",
          action_items: [],
          next_races: [],
          metrics: {},
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

    await page.route("**/api/admin-bo/invitations*", (route) => {
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
        body: JSON.stringify({
          invitations: [
            {
              id: "inv-1",
              email: "future@test.fr",
              sent_by: ADMIN_USER.email,
              accepted: false,
              status: "pending",
              created_at: "2026-05-10T14:00:00Z",
              expires_at: "2026-06-10T14:00:00Z",
            },
          ],
          total: 1,
        }),
      });
    });
  });

  test("admin page loads with tab navigation", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/admin");
    // Should not show error boundary
    await expect(page.getByText(/une erreur est survenue/i)).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Utilisateurs", exact: true })).toBeVisible();
  });

  test("users tab shows member list", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await selectAdminTab(page, "Utilisateurs");

    await expect(page.getByText("SpeedKing")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("RaceQueen")).toBeVisible();
    await expect(page.getByTestId("admin-user-row-identity-3")).toContainText("newbie@test.fr");
  });

  test("devops beta tab shows feedback messages with categories", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await selectAdminTab(page, "DevOps");

    // DevOps opens on the "Audit" section by default; activate "Beta" to reach
    // the feedbacks panel before asserting on its content.
    await page.getByTestId("devops-tab-beta").click();

    await expect(page.getByText("Le classement ne se met pas a jour")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Bug", { exact: true })).toBeVisible();
    await expect(page.getByText("Suggestion", { exact: true })).toBeVisible();
  });

  test("invitation form validates required fields", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await selectAdminTab(page, "Invitations");

    const sendBtn = page.getByRole("button", { name: /envoyer l'invitation/i });
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await sendBtn.click();
    await expect(page.getByText("Renseignez une adresse email")).toBeVisible();
  });

  test("invitation send button enables when form is filled", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    await selectAdminTab(page, "Invitations");

    await page.getByTestId("invitation-email").fill("new@test.fr");

    const sendBtn = page.getByRole("button", { name: /envoyer l'invitation/i });
    await expect(sendBtn).toBeEnabled();
  });
});
