/**
 * Prediction page data hook — TanStack Query migration.
 *
 * Fetches race details, drivers, and existing prediction.
 * All selection/form state stays in the page component.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

function useRaceDetails(raceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.races.get(raceId!),
    queryFn: () => api.races.get(raceId!),
    enabled: !!raceId,
  });
}

function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: () => api.drivers.list(),
  });
}

function useExistingPrediction(raceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.predictions.get(raceId!),
    queryFn: async () => {
      try {
        return (await api.predictions.get(raceId!)) || null;
      } catch {
        return null;
      }
    },
    enabled: !!raceId,
  });
}

export function usePredictionData(raceId: string | undefined) {
  const raceQuery = useRaceDetails(raceId);
  const driversQuery = useDrivers();
  const predictionQuery = useExistingPrediction(raceId);

  const loading = raceQuery.isLoading || driversQuery.isLoading || predictionQuery.isLoading;

  return {
    loading,
    race: raceQuery.data ?? null,
    drivers: driversQuery.data ?? [],
    existingPrediction: predictionQuery.data ?? null,
    refetchPrediction: predictionQuery.refetch,
  };
}
