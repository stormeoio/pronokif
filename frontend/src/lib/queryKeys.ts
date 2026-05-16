/**
 * Centralized query key factory for TanStack Query.
 *
 * Benefits:
 * - Prevents typos and duplication
 * - Enables targeted invalidation (invalidate all leagues queries: queryKeys.leagues._def)
 * - IntelliSense for all query keys
 *
 * Pattern: each namespace has a `_def` (base key for invalidation) and methods
 * that return the full key tuple.
 */

export const queryKeys = {
  // ── Auth ─────────────────────────────────────────────────────
  auth: {
    _def: ["/auth"] as const,
    me: () => ["/auth/me"] as const,
  },

  // ── Races ────────────────────────────────────────────────────
  races: {
    _def: ["/races"] as const,
    list: () => ["/races"] as const,
    upcoming: () => ["/races/upcoming"] as const,
    next: () => ["/races/next"] as const,
    get: (id: string) => ["/races", id] as const,
    details: (id: string) => ["/races", id, "details"] as const,
  },

  // ── Drivers ──────────────────────────────────────────────────
  drivers: {
    _def: ["/drivers"] as const,
    list: () => ["/drivers"] as const,
    all: () => ["/drivers/all"] as const,
    details: (id: string) => ["/drivers", id, "details"] as const,
    compare: (id1: string, id2: string) => ["/drivers/compare", id1, id2] as const,
  },

  // ── Leagues ──────────────────────────────────────────────────
  leagues: {
    _def: ["/leagues"] as const,
    my: () => ["/leagues/my"] as const,
    get: (id: string) => ["/leagues", id] as const,
    byCode: (code: string) => ["/leagues/by-code", code] as const,
    members: (id: string) => ["/leagues", id, "members"] as const,
    leaderboard: (id: string) => ["/leagues", id, "leaderboard"] as const,
    messages: (id: string) => ["/leagues", id, "messages"] as const,
    unreadMessages: () => ["/leagues/unread-messages"] as const,
  },

  // ── Predictions ──────────────────────────────────────────────
  predictions: {
    _def: ["/predictions"] as const,
    get: (raceId: string) => ["/predictions/race", raceId] as const,
    stats: () => ["/predictions/stats"] as const,
    history: () => ["/predictions/history"] as const,
    pointsHistory: () => ["/predictions/points-history"] as const,
  },

  // ── Custom Predictions ───────────────────────────────────────
  customPredictions: {
    _def: ["/custom-predictions"] as const,
    list: (leagueId: string, raceId: string) =>
      ["/custom-predictions/to-answer", leagueId, raceId] as const,
  },

  // ── Leaderboard ──────────────────────────────────────────────
  leaderboard: {
    _def: ["/leaderboard"] as const,
    global: () => ["/leaderboard/global"] as const,
    league: (leagueId: string) => ["/leagues/leaderboard", leagueId] as const,
  },

  // ── Minigames ────────────────────────────────────────────────
  minigames: {
    _def: ["/minigames"] as const,
    attempts: (game: string, raceId: string) => [`/minigames/attempts/${game}`, raceId] as const,
    leaderboard: (game: string, leagueId: string, raceId: string) =>
      [`/minigames/leaderboard/${game}`, leagueId, raceId] as const,
    globalLeaderboard: (game: string) => [`/minigames/global-leaderboard/${game}`] as const,
  },

  // ── Missions ─────────────────────────────────────────────────
  missions: {
    _def: ["/user/missions"] as const,
    list: () => ["/user/missions"] as const,
  },

  // ── Notifications ────────────────────────────────────────────
  notifications: {
    _def: ["/notifications"] as const,
    list: () => ["/notifications"] as const,
    unreadCount: () => ["/notifications/unread-count"] as const,
  },

  // ── Avatars ──────────────────────────────────────────────────
  avatars: {
    _def: ["/avatars"] as const,
    list: () => ["/avatars"] as const,
  },

  // ── User ─────────────────────────────────────────────────────
  user: {
    _def: ["/user"] as const,
    stats: () => ["/user/stats"] as const,
    profile: (userId: string) => ["/users", userId, "profile"] as const,
  },

  // ── Results ──────────────────────────────────────────────────
  results: {
    _def: ["/results"] as const,
    get: (raceId: string) => ["/results", raceId] as const,
  },

  // ── Championship (external API) ─────────────────────────────
  championship: {
    _def: ["jolpica"] as const,
    driverStandings: () => ["jolpica", "driverstandings"] as const,
    constructorStandings: () => ["jolpica", "constructorstandings"] as const,
    schedule: () => ["jolpica", "schedule"] as const,
  },
} as const;
