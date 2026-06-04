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
  email_verified: true,
  level: 7,
  xp: 450,
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

export const TEST_STATS = {
  total_predictions: 24,
  races_participated: 12,
  correct_poles: 5,
  correct_winners: 8,
  perfect_top10: 2,
};

export const TEST_MISSIONS = {
  missions: [
    {
      mission_id: "m1",
      name: "Premier prono",
      description: "Fais ton premier pronostic",
      icon: "target",
      xp_reward: 50,
      current: 1,
      target: 1,
      completed: true,
      claimed: false,
    },
    {
      mission_id: "m2",
      name: "Fidele",
      description: "Participe 5 courses de suite",
      icon: "calendar",
      xp_reward: 100,
      current: 3,
      target: 5,
      completed: false,
      claimed: false,
    },
    {
      mission_id: "m3",
      name: "Expert",
      description: "Termine dans le top 3 du classement",
      icon: "trophy",
      xp_reward: 200,
      current: 0,
      target: 1,
      completed: false,
      claimed: false,
      rarity: "epic",
    },
  ],
  categories: {
    general: [
      {
        mission_id: "m1",
        name: "Premier prono",
        description: "Fais ton premier pronostic",
        icon: "target",
        xp_reward: 50,
        current: 1,
        target: 1,
        completed: true,
        claimed: false,
      },
      {
        mission_id: "m2",
        name: "Fidele",
        description: "Participe 5 courses de suite",
        icon: "calendar",
        xp_reward: 100,
        current: 3,
        target: 5,
        completed: false,
        claimed: false,
      },
      {
        mission_id: "m3",
        name: "Expert",
        description: "Termine dans le top 3 du classement",
        icon: "trophy",
        xp_reward: 200,
        current: 0,
        target: 1,
        completed: false,
        claimed: false,
        rarity: "epic",
      },
    ],
  },
};

/**
 * Mock the auth state so the app thinks user is logged in.
 * Sets cached user state + intercepts session endpoints.
 */
export async function loginAsTestUser(page: Page) {
  const userJson = JSON.stringify(TEST_USER);

  // Set cached user before navigation; auth.tsx validates the cookie-backed session.
  await page.addInitScript((user) => {
    localStorage.setItem("user", user);
    sessionStorage.setItem("pronokif:splash-seen", "true");
  }, userJson);

  // Mock auth verification
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: TEST_USER }),
    }),
  );

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
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.endsWith("/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: TEST_USER }),
      });
    }

    if (path.endsWith("/auth/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_USER),
      });
    }

    if (path.includes("/drivers")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_DRIVERS),
      });
    }

    if (path.includes("/races/race-1")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(TEST_RACE),
      });
    }

    if (path.includes("/minigames/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // Full-season list — the refonte dashboard carousel reads api.races.list()
  // (GET /races). Registered before the more specific /races/* routes below,
  // which still take precedence (Playwright matches last-registered first).
  await page.route("**/api/races", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([TEST_RACE]),
    }),
  );

  await page.route("**/api/races/next", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_RACE),
    }),
  );

  await page.route("**/api/races/upcoming", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([TEST_RACE]),
    }),
  );

  await page.route("**/api/races/race-1**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_RACE),
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

  await page.route("**/api/leaderboard/global*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ leaderboard: [], my_position: 42 }),
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

  await page.route("**/api/leagues/league-1/leaderboard", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { user_id: "e2e-user-1", username: "TestPilot", total_points: 120, rank: 1 },
      ]),
    }),
  );

  await page.route("**/api/predictions/stats", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_STATS),
    }),
  );

  await page.route("**/api/predictions/points-history", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ history: [], summary: { total_points: 120 } }),
    }),
  );

  await page.route("**/api/predictions/race/*", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "No prediction" }),
    }),
  );

  await page.route("**/api/user/stats", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_STATS),
    }),
  );

  await page.route("**/api/user/missions*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(TEST_MISSIONS),
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
