/**
 * Dashboard data hook — TanStack Query migration.
 *
 * Replaces the useEffect + useState + useCallback pattern with
 * declarative queries. Automatic refetch, caching, and error handling.
 */
import { useQuery, useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { League, LeaderboardEntry, Prediction, Race } from "@/types/api";

// ── Individual queries ─────────────────────────────────────────────

function useUpcomingRaces() {
  return useQuery({
    queryKey: queryKeys.races.upcoming(),
    queryFn: async () => {
      const data = await api.races.upcoming();
      const now = Date.now();
      return (data || []).filter((r) => {
        if (r.status === "cancelled") return false;
        if (r.status !== "finished") return true;
        if (!r.race_end_at) return false;
        return now - new Date(r.race_end_at).getTime() < 30 * 60_000;
      });
    },
    refetchInterval: 10_000,
  });
}

function useAvatars() {
  return useQuery({
    queryKey: queryKeys.avatars.list(),
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000, // avatars don't change often
  });
}

function useMyLeagues() {
  return useQuery({
    queryKey: queryKeys.leagues.my(),
    queryFn: async () => {
      const data = await api.leagues.my();
      return data || [];
    },
  });
}

function useUnreadMessages() {
  return useQuery({
    queryKey: queryKeys.leagues.unreadMessages(),
    queryFn: async () => {
      const data = await api.leagues.unreadMessages();
      return data?.by_league || {};
    },
    refetchInterval: 30_000, // poll every 30s for unread badges
  });
}

function usePredictionStats() {
  return useQuery({
    queryKey: ["/predictions/stats"],
    queryFn: () => api.predictions.stats(),
  });
}

function usePointsHistory() {
  return useQuery({
    queryKey: ["/predictions/points-history"],
    queryFn: () => api.predictions.pointsHistory(),
  });
}

function useGlobalLeaderboard() {
  return useQuery({
    queryKey: ["/leaderboard/global"],
    queryFn: () => api.leaderboard.global(100),
  });
}

// ── Dependent queries: predictions per race ────────────────────────

function useRacePredictions(races: Race[]) {
  return useQueries({
    queries: races.map((race) => ({
      queryKey: queryKeys.predictions.get(String(race.id)),
      queryFn: async () => {
        try {
          return await api.predictions.get(String(race.id));
        } catch {
          return null;
        }
      },
      enabled: races.length > 0,
    })),
  });
}

function useLeagueLeaderboards(leagues: League[]) {
  return useQueries({
    queries: leagues.map((league) => ({
      queryKey: ["/leagues", league.id, "leaderboard"],
      queryFn: () => api.leagues.leaderboard(league.id),
      enabled: leagues.length > 0,
    })),
  });
}

// ── Composed hook ──────────────────────────────────────────────────

export function useDashboardData(userId?: string) {
  const racesQuery = useUpcomingRaces();
  const avatarsQuery = useAvatars();
  const leaguesQuery = useMyLeagues();
  const unreadQuery = useUnreadMessages();
  const statsQuery = usePredictionStats();
  const pointsHistoryQuery = usePointsHistory();
  const globalLeaderboardQuery = useGlobalLeaderboard();

  const upcomingRaces = racesQuery.data ?? [];
  const userLeagues = leaguesQuery.data ?? [];
  const predictionQueries = useRacePredictions(upcomingRaces);
  const leagueLeaderboardQueries = useLeagueLeaderboards(userLeagues);

  // Build predictions map: { raceId: predictionData }
  const predictions: Record<string, Prediction | null> = {};
  upcomingRaces.forEach((race, i) => {
    predictions[race.id] = predictionQueries[i]?.data ?? null;
  });

  const leagueRanks: Record<
    string,
    { position: number | null; total: number; total_points: number | null }
  > = {};
  userLeagues.forEach((league, i) => {
    const leaderboard = (leagueLeaderboardQueries[i]?.data ?? []) as LeaderboardEntry[];
    const myEntry = userId ? leaderboard.find((entry) => entry.user_id === userId) : null;
    leagueRanks[league.id] = {
      position: myEntry?.position ?? null,
      total: leaderboard.length || league.members?.length || 0,
      total_points: myEntry?.total_points ?? null,
    };
  });

  const loading =
    racesQuery.isLoading ||
    avatarsQuery.isLoading ||
    leaguesQuery.isLoading ||
    statsQuery.isLoading ||
    pointsHistoryQuery.isLoading ||
    globalLeaderboardQuery.isLoading;

  return {
    loading,
    upcomingRaces,
    avatars: avatarsQuery.data ?? {},
    userLeagues,
    leagueRanks,
    unreadChatByLeague: unreadQuery.data ?? {},
    predictions,
    predictionStats: statsQuery.data ?? null,
    pointsHistory: pointsHistoryQuery.data ?? {
      history: [],
      summary: { total_points: 0, total_xp: 0, races_with_results: 0, races_pending: 0 },
    },
    globalLeaderboard: globalLeaderboardQuery.data ?? null,
  };
}
