/**
 * Prediction page data hook — TanStack Query migration.
 *
 * Fetches race details, drivers, existing prediction, and minigame scores.
 * All selection/form state stays in the page component.
 */
import { useQuery } from "@tanstack/react-query";
import { api, apiClient } from "@/lib/api";
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

function useMinigamesCompletion() {
  return useQuery({
    queryKey: ["/minigames/completion"],
    queryFn: async () => {
      try {
        const [reactionRes, batakRes] = await Promise.all([
          apiClient.get("/minigames/reaction/scores").catch(() => ({ data: [] })),
          apiClient.get("/minigames/batak/scores").catch(() => ({ data: [] })),
        ]);
        const reactionComp = reactionRes.data.filter((s: { mode: string }) => s.mode === "competition").length;
        const batakComp = batakRes.data.filter((s: { mode: string }) => s.mode === "competition").length;
        return reactionComp >= 3 && batakComp >= 3;
      } catch {
        return false;
      }
    },
  });
}

export function usePredictionData(raceId: string | undefined) {
  const raceQuery = useRaceDetails(raceId);
  const driversQuery = useDrivers();
  const predictionQuery = useExistingPrediction(raceId);
  const minigamesQuery = useMinigamesCompletion();

  const loading = raceQuery.isLoading || driversQuery.isLoading || predictionQuery.isLoading;

  return {
    loading,
    race: raceQuery.data ?? null,
    drivers: driversQuery.data ?? [],
    existingPrediction: predictionQuery.data ?? null,
    minigamesComplete: minigamesQuery.data ?? false,
    refetchPrediction: predictionQuery.refetch,
  };
}
