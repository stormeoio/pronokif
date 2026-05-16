/**
 * League detail data hook — TanStack Query migration.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useLeagueDetailData(leagueId: string | undefined) {
  const leagueQuery = useQuery({
    queryKey: ["/leagues", leagueId],
    queryFn: () => api.leagues.get(leagueId!),
    enabled: !!leagueId,
  });

  const membersQuery = useQuery({
    queryKey: ["/leagues", leagueId, "members"],
    queryFn: () => api.leagues.members(leagueId!),
    enabled: !!leagueId,
  });

  const leaderboardQuery = useQuery({
    queryKey: ["/leagues", leagueId, "leaderboard"],
    queryFn: () => api.leagues.leaderboard(leagueId!),
    enabled: !!leagueId,
  });

  const avatarsQuery = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  return {
    loading: leagueQuery.isLoading || membersQuery.isLoading || leaderboardQuery.isLoading,
    error: leagueQuery.error || membersQuery.error || leaderboardQuery.error,
    league: leagueQuery.data ?? null,
    members: membersQuery.data ?? [],
    leaderboard: leaderboardQuery.data ?? [],
    avatars: avatarsQuery.data ?? null,
    refetch: () => {
      leagueQuery.refetch();
      membersQuery.refetch();
      leaderboardQuery.refetch();
    },
  };
}
