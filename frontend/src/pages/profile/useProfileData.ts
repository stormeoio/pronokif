/**
 * Profile page data hook — TanStack Query migration.
 *
 * Fetches leagues, prediction stats, avatars, global leaderboard position,
 * points history, and optionally league-specific leaderboard.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useProfileData(userId: string, currentLeagueId: string | null) {
  const leaguesQuery = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: async () => {
      const res = await apiClient.get("/leagues/my");
      return res.data;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["/predictions/stats"],
    queryFn: async () => {
      const res = await apiClient.get("/predictions/stats");
      return res.data;
    },
  });

  const avatarsQuery = useQuery({
    queryKey: ["/avatars"],
    queryFn: async () => {
      const res = await apiClient.get("/avatars");
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const globalLbQuery = useQuery({
    queryKey: ["/leaderboard/global"],
    queryFn: async () => {
      const res = await apiClient.get("/leaderboard/global");
      return res.data.my_position ?? null;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["/predictions/points-history"],
    queryFn: async () => {
      const res = await apiClient.get("/predictions/points-history");
      return res.data;
    },
  });

  const leagueLeaderboardQuery = useQuery({
    queryKey: ["/leagues/leaderboard", currentLeagueId],
    queryFn: async () => {
      const res = await apiClient.get(`/leagues/${currentLeagueId}/leaderboard`);
      const myEntry = res.data.find((e: any) => e.user_id === userId);
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
