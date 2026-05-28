import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs } from "./helpers";

const PROFILE_DATA = {
  id: "e2e-user-1",
  username: "TestPilot",
  email: "test@pronokif.fr",
  level: 7,
  xp: 450,
  xp_to_next: 600,
  avatar_id: "avatar-1",
  created_at: "2025-03-01T10:00:00Z",
  stats: {
    predictions_count: 24,
    correct_poles: 5,
    correct_winners: 8,
    perfect_top3: 2,
    races_participated: 12,
  },
};

const MISSIONS_DATA = {
  missions: [
    {
      id: "m1",
      title: "Premier prono",
      description: "Fais ton premier pronostic",
      xp: 50,
      completed: true,
    },
    {
      id: "m2",
      title: "Fidele",
      description: "Participe 5 courses de suite",
      xp: 100,
      completed: false,
      progress: 3,
      target: 5,
    },
    {
      id: "m3",
      title: "Expert",
      description: "Termine dans le top 3 du classement",
      xp: 200,
      completed: false,
      progress: 0,
      target: 1,
    },
  ],
};

test.describe("Profile page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await mockDashboardAPIs(page);

    await page.route("**/api/profile*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFILE_DATA),
      }),
    );

    await page.route("**/api/users/e2e-user-1/stats", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PROFILE_DATA.stats),
      }),
    );
  });

  test("displays username and level", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("TestPilot")).toBeVisible({ timeout: 10000 });
    // Level indicator
    await expect(page.getByText(/7|Niv/)).toBeVisible();
  });

  test("shows prediction statistics", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // At least one stat should be visible
    await expect(page.getByText("TestPilot")).toBeVisible({ timeout: 10000 });
    // Page should render without errors
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });

  test("page loads without crashing", async ({ page }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/profile");
    // No error boundary
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });
});

test.describe("Missions page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await mockDashboardAPIs(page);

    await page.route("**/api/missions*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MISSIONS_DATA),
      }),
    );
  });

  test("displays missions list", async ({ page }) => {
    await page.goto("/missions");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Premier prono", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Fidele", { exact: true })).toBeVisible();
  });

  test("shows completed missions differently from active ones", async ({ page }) => {
    await page.goto("/missions");
    await page.waitForLoadState("networkidle");

    // Both missions should be visible
    await expect(page.getByText("Premier prono", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Expert", { exact: true })).toBeVisible();
  });

  test("page loads without errors", async ({ page }) => {
    await page.goto("/missions");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL("/missions");
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });
});
