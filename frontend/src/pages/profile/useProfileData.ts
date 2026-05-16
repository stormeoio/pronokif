/**
 * Profile page data hook — TanStack Query migration.
 *
 * Fetches leagues, prediction stats, avatars, global leaderboard position,
 * points history, and optionally league-specific leaderboard.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
    queryKey: ["/leaderboard/global"],
    queryFn: async () => {
      const data = await api.leaderboard.global();
      return data.my_position ?? null;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["/predictions/points-history"],
    queryFn: () => api.predictions.pointsHistory() as Promise<any>,
  });

  const leagueLeaderboardQuery = useQuery({
    queryKey: ["/leagues/leaderboard", currentLeagueId],
    queryFn: async () => {
      const data = await api.leagues.leaderboard(currentLeagueId!);
      const myEntry = data.find((e) => e.user_id === userId);
      return myEntry?.total_points ?? null;
    },
    enabled: !!currentLeagueId,
  });

  const history = historyQuery.data ?? { history: [], summary: {} };
  const totalPoints = leagueLeaderboardQuery.data ?? history.summary?.total_points ?? 0;

  const loading =
    leaguesQuery.isLoading ||
    statsQuery.isLoading ||
    avatarsQuery.isLoading ||
    historyQuery.isLoading;

  return {
    loading,
    leagues: leaguesQuery.data ?? [],
    avatars: avatarsQuery.data ?? null,
    globalPosition: globalLbQuery.data ?? null,
    pointsHistory: history,
    stats: {
      totalPredictions: statsQuery.data?.total_predictions ?? 0,
      racesParticipated: statsQuery.data?.races_participated ?? 0,
      totalPoints,
    },
  };
}
