/**
 * Dashboard data hook — TanStack Query migration.
 *
 * Replaces the useEffect + useState + useCallback pattern with
 * declarative queries. Automatic refetch, caching, and error handling.
 */
import { useQuery, useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

// ── Individual queries ─────────────────────────────────────────────

function useUpcomingRaces() {
  return useQuery({
    queryKey: queryKeys.races.upcoming(),
    queryFn: async () => {
      const data = (await api.races.upcoming()) as any[];
      return (data || []).filter((r: any) => r.status !== "finished");
    },
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

// ── Dependent queries: predictions per race ────────────────────────

function useRacePredictions(races: any[]) {
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

// ── Composed hook ──────────────────────────────────────────────────

export function useDashboardData() {
  const racesQuery = useUpcomingRaces();
  const avatarsQuery = useAvatars();
  const leaguesQuery = useMyLeagues();
  const unreadQuery = useUnreadMessages();

  const upcomingRaces = racesQuery.data ?? [];
  const predictionQueries = useRacePredictions(upcomingRaces);

  // Build predictions map: { raceId: predictionData }
  const predictions: Record<string, any> = {};
  upcomingRaces.forEach((race: any, i: number) => {
    predictions[race.id] = predictionQueries[i]?.data ?? null;
  });

  const loading = racesQuery.isLoading || avatarsQuery.isLoading || leaguesQuery.isLoading;

  return {
    loading,
    upcomingRaces,
    avatars: avatarsQuery.data ?? {},
    userLeagues: leaguesQuery.data ?? [],
    unreadChatByLeague: unreadQuery.data ?? {},
    predictions,
  };
}
