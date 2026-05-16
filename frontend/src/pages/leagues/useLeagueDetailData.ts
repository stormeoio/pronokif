/**
 * League detail data hook — TanStack Query migration.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useLeagueDetailData(leagueId: string | undefined) {
  const leagueQuery = useQuery({
    queryKey: ["/leagues", leagueId],
    queryFn: async () => {
      const res = await apiClient.get(`/leagues/${leagueId}`);
      return res.data;
    },
    enabled: !!leagueId,
  });

  const membersQuery = useQuery({
    queryKey: ["/leagues", leagueId, "members"],
    queryFn: async () => {
      const res = await apiClient.get(`/leagues/${leagueId}/members`);
      return res.data;
    },
    enabled: !!leagueId,
  });

  const leaderboardQuery = useQuery({
    queryKey: ["/leagues", leagueId, "leaderboard"],
    queryFn: async () => {
      const res = await apiClient.get(`/leagues/${leagueId}/leaderboard`);
      return res.data;
    },
    enabled: !!leagueId,
  });

  const avatarsQuery = useQuery({
    queryKey: ["/avatars"],
    queryFn: async () => {
      const res = await apiClient.get("/avatars");
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  return {
    loading: leagueQuery.isLoading || membersQuery.isLoading || leaderboardQuery.isLoading,
    error: leagueQuery.error || membersQuery.error || leaderboardQuery.error,
    league: leagueQuery.data ?? null,
    members: membersQuery.data ?? [],
    leaderboard: leaderboardQuery.data ?? [],
    avatars: avatarsQuery.data ?? {},
    refetch: () => {
      leagueQuery.refetch();
      membersQuery.refetch();
      leaderboardQuery.refetch();
    },
  };
}
