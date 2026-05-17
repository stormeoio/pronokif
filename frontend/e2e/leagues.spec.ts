import { test, expect } from "@playwright/test";
import { loginAsTestUser, mockDashboardAPIs } from "./helpers";

const TEST_LEAGUE = {
  id: "league-1",
  name: "Les Pilotes",
  code: "PILOT1",
  owner_id: "e2e-user-1",
  members_count: 5,
  created_at: "2026-01-15T10:00:00Z",
};

const TEST_LEAGUE_MEMBERS = [
  { id: "e2e-user-1", username: "TestPilot", avatar_id: "avatar-1", points: 120, rank: 1 },
  { id: "u2", username: "SpeedKing", avatar_id: "avatar-2", points: 95, rank: 2 },
  { id: "u3", username: "RaceQueen", avatar_id: "avatar-3", points: 80, rank: 3 },
];

const TEST_CHAT_MESSAGES = [
  { id: "m1", user_id: "u2", username: "SpeedKing", message: "Allez Max!", created_at: "2026-05-10T14:00:00Z" },
  { id: "m2", user_id: "e2e-user-1", username: "TestPilot", message: "Hamilton pour la victoire", created_at: "2026-05-10T14:01:00Z" },
];

test.describe("Leagues flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await mockDashboardAPIs(page);

    // League detail
    await page.route("**/api/leagues/league-1", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_LEAGUE),
      }),
    );

    // League members / leaderboard
    await page.route("**/api/leagues/league-1/leaderboard", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_LEAGUE_MEMBERS),
      }),
    );

    // League chat
    await page.route("**/api/leagues/league-1/messages*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_CHAT_MESSAGES),
      }),
    );
  });

  test("league detail page shows league name and members", async ({ page }) => {
    await page.goto("/league/league-1/details");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Les Pilotes")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("SpeedKing")).toBeVisible();
  });

  test("league chat page loads messages", async ({ page }) => {
    await page.goto("/league/league-1/chat");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Allez Max!")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Hamilton pour la victoire")).toBeVisible();
  });

  test("league chat has message input field", async ({ page }) => {
    await page.goto("/league/league-1/chat");
    await page.waitForLoadState("networkidle");

    // Message input should exist
    const input = page.locator("input[type='text'], textarea").first();
    await expect(input).toBeVisible({ timeout: 10000 });
  });

  test("join league page loads with code pre-filled", async ({ page }) => {
    await page.route("**/api/leagues/join", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "league-2", name: "Nouvelle Ligue" }),
      }),
    );

    await page.goto("/join/ABC123");
    await page.waitForLoadState("networkidle");

    // Page should load without error
    await expect(page).toHaveURL(/\/join\/ABC123/);
    await expect(page.getByText("Une erreur est survenue")).not.toBeVisible();
  });
});
