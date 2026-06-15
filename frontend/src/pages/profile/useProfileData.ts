/**
 * Profile page data hook — TanStack Query migration.
 *
 * Fetches leagues, prediction stats, avatars, global leaderboard position,
 * points history, and optionally league-specific leaderboard.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CagnotteResponse, LeaderboardEntry } from "@/types/api";

function asFiniteNumber(value: unknown, fallback: number | null = 0): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Cagnotte (mini-game winnings) can arrive partially-formed: an empty body on a
 * backend hiccup, an API version skew, or — as surfaced by the profile E2E suite —
 * an unmocked endpoint. The profile card reads `breakdown.reaction`/`breakdown.batak`
 * directly, so a missing `breakdown` throws and the error boundary swallows the
 * entire page. Normalize to a complete object or `null` so the card's
 * `{cagnotte && ...}` guard can hide it cleanly instead of crashing.
 */
function normalizeCagnotte(data: unknown): CagnotteResponse | null {
  if (!data || typeof data !== "object") return null;
  const c = data as Partial<CagnotteResponse>;
  if (typeof c.balance !== "number" || !c.breakdown || typeof c.breakdown !== "object") {
    return null;
  }
  return {
    balance: c.balance,
    breakdown: {
      reaction: asFiniteNumber(c.breakdown.reaction, 0) ?? 0,
      batak: asFiniteNumber(c.breakdown.batak, 0) ?? 0,
    },
    total_games: asFiniteNumber(c.total_games, 0) ?? 0,
    history: Array.isArray(c.history) ? c.history : [],
  };
}

function getLeaderboardEntries(payload: unknown): LeaderboardEntry[] {
  if (Array.isArray(payload)) return payload as LeaderboardEntry[];

  if (payload && typeof payload === "object") {
    const maybeWrapped = payload as { leaderboard?: unknown };
    if (Array.isArray(maybeWrapped.leaderboard)) {
      return maybeWrapped.leaderboard as LeaderboardEntry[];
    }
  }

  return [];
}

export function useProfileData(userId: string, currentLeagueId: string | null) {
  const leaguesQuery = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my(),
  });

  const statsQuery = useQuery({
    queryKey: ["/predictions/stats"],
    queryFn: () => api.predictions.stats(),
  });

  const avatarsQuery = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  const globalLbQuery = useQuery({
    queryKey: ["/leaderboard/global", "profile-position"],
    queryFn: async () => {
      const data = await api.leaderboard.global();
      return asFiniteNumber(data.my_position, null);
    },
  });

  const historyQuery = useQuery({
    queryKey: ["/predictions/points-history"],
    queryFn: () => api.predictions.pointsHistory() as Promise<any>,
  });

  const cagnotteQuery = useQuery({
    queryKey: ["/user/cagnotte"],
    queryFn: () => api.user.cagnotte(),
    staleTime: 2 * 60_000,
  });

  const leagueLeaderboardQuery = useQuery({
    queryKey: ["/leagues/leaderboard", currentLeagueId],
    queryFn: async () => {
      const data = await api.leagues.leaderboard(currentLeagueId!);
      const entries = getLeaderboardEntries(data);
      const myEntry = entries.find((e) => e.user_id === userId);
      return asFiniteNumber(myEntry?.total_points, null);
    },
    enabled: !!currentLeagueId,
  });

  const history = historyQuery.data ?? { history: [], summary: {} };
  const totalPoints =
    leagueLeaderboardQuery.data ?? asFiniteNumber(history.summary?.total_points, 0) ?? 0;

  const loading =
    leaguesQuery.isLoading ||
    statsQuery.isLoading ||
    avatarsQuery.isLoading ||
    historyQuery.isLoading;

  return {
    loading,
    leagues: leaguesQuery.data ?? [],
    avatars: avatarsQuery.data ?? null,
    globalPosition: asFiniteNumber(globalLbQuery.data, null),
    pointsHistory: history,
    cagnotte: normalizeCagnotte(cagnotteQuery.data),
    stats: {
      totalPredictions: statsQuery.data?.total_predictions ?? 0,
      racesParticipated: statsQuery.data?.races_participated ?? 0,
      totalPoints,
    },
  };
}
