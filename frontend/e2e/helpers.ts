import { type Page } from "@playwright/test";

/**
 * E2E test helpers for Pronokif.
 *
 * These intercept API calls so tests run without a live backend.
 * For integration tests with real backend, remove the mocks.
 */

export const TEST_USER = {
  id: "e2e-user-1",
  email: "test@pronokif.fr",
  username: "TestPilot",
  avatar_id: "avatar-1",
  current_league_id: "league-1",
};

export const TEST_RACE = {
  id: "race-1",
  name: "Monaco Grand Prix",
  circuit: "Circuit de Monaco",
  date: new Date(Date.now() + 86400000 * 3).toISOString(),
  status: "upcoming",
  season: 2026,
  round: 7,
};

export const TEST_DRIVERS = [
  { id: "d1", name: "Max Verstappen", team: "Red Bull Racing", number: 1 },
  { id: "d2", name: "Lewis Hamilton", team: "Ferrari", number: 44 },
  { id: "d3", name: "Charles Leclerc", team: "Ferrari", number: 16 },
  { id: "d4", name: "Lando Norris", team: "McLaren", number: 4 },
  { id: "d5", name: "Oscar Piastri", team: "McLaren", number: 81 },
];

/**
 * Mock the auth state so the app thinks user is logged in.
 * Sets localStorage token + user + intercepts /auth/me endpoint.
 */
export async function loginAsTestUser(page: Page) {
  const userJson = JSON.stringify(TEST_USER);

  // Set auth token AND user before navigation (auth.tsx checks both)
  await page.addInitScript((user) => {
    localStorage.setItem("token", "e2e-fake-jwt-token");
    localStorage.setItem("user", user);
  }, userJson);

  // Mock auth verification
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_USER),
    }),
  );
}

/**
 * Mock common API endpoints for an authenticated session.
 */
export async function mockDashboardAPIs(page: Page) {
  await page.route("**/api/races/upcoming", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([TEST_RACE]),
    }),
  );

  await page.route("**/api/drivers", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_DRIVERS),
    }),
  );

  await page.route("**/api/avatars", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    }),
  );

  await page.route("**/api/leagues/my", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "league-1", name: "Les Pilotes", code: "PILOT1" }]),
    }),
  );

  await page.route("**/api/leagues/unread-messages", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ by_league: {} }),
    }),
  );

  await page.route("**/api/predictions/*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "No prediction" }),
    }),
  );

  await page.route("**/api/notifications/unread-count", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ count: 0 }),
    }),
  );
}
