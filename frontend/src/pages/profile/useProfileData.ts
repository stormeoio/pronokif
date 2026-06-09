/**
 * Profile page data hook — TanStack Query migration.
 *
 * Fetches leagues, prediction stats, avatars, global leaderboard position,
 * points history, and optionally league-specific leaderboard.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LeaderboardEntry } from "@/types/api";

function asFiniteNumber(value: unknown, fallback: number | null = 0): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
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
    cagnotte: cagnotteQuery.data ?? null,
    stats: {
      totalPredictions: statsQuery.data?.total_predictions ?? 0,
      racesParticipated: statsQuery.data?.races_participated ?? 0,
      totalPoints,
    },
  };
}
