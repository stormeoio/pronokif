/**
 * Custom predictions page data hook — TanStack Query migration.
 *
 * Fetches leagues + races for initial load, and predictions
 * for the selected league/race combination.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useCustomPredictionsData(
  leagueId: string | undefined,
  selectedLeague: any,
  selectedRace: any,
) {
  const leaguesQuery = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: async () => {
      const res = await apiClient.get("/leagues/my");
      return res.data;
    },
  });

  const racesQuery = useQuery({
    queryKey: ["/races"],
    queryFn: async () => {
      const res = await apiClient.get("/races");
      return (res.data || []).filter((r: any) => r.status !== "finished");
    },
  });

  const predictionsQuery = useQuery({
    queryKey: ["/custom-predictions/to-answer", selectedLeague?.id, selectedRace?.id],
    queryFn: async () => {
      const res = await apiClient.get(
        `/custom-predictions/to-answer/${selectedLeague.id}/${selectedRace.id}`,
      );
      return res.data;
    },
    enabled: !!selectedLeague && !!selectedRace,
  });

  const loading = leaguesQuery.isLoading || racesQuery.isLoading;

  // Derive the current league from fetched leagues
  const leagues = leaguesQuery.data ?? [];
  const defaultLeague = leagues.find((l: any) => l.id === leagueId) || leagues[0] || null;

  return {
    loading,
    leagues,
    allRaces: racesQuery.data ?? [],
    defaultLeague,
    predictions: predictionsQuery.data ?? [],
    refetchPredictions: predictionsQuery.refetch,
  };
}
