/**
 * Championship page data hook — TanStack Query migration.
 *
 * Fetches F1 driver standings, constructor standings, and race schedule
 * from the Jolpica (Ergast) API using native fetch.
 */
import { useQuery } from "@tanstack/react-query";
import { JOLPICA_API } from "./championshipUtils";

function useDriverStandings() {
  return useQuery({
    queryKey: ["jolpica", "driverstandings"],
    queryFn: async () => {
      const res = await fetch(`${JOLPICA_API}/current/driverstandings.json`);
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
      return {
        season: list?.season ?? new Date().getFullYear(),
        standings: list?.DriverStandings ?? [],
      };
    },
    staleTime: 5 * 60_000,
  });
}

function useConstructorStandings() {
  return useQuery({
    queryKey: ["jolpica", "constructorstandings"],
    queryFn: async () => {
      const res = await fetch(`${JOLPICA_API}/current/constructorstandings.json`);
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
      return list?.ConstructorStandings ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

function useRaceSchedule() {
  return useQuery({
    queryKey: ["jolpica", "schedule"],
    queryFn: async () => {
      const res = await fetch(`${JOLPICA_API}/current.json`);
      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      return data?.MRData?.RaceTable?.Races ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useChampionshipData() {
  const driversQuery = useDriverStandings();
  const constructorsQuery = useConstructorStandings();
  const scheduleQuery = useRaceSchedule();

  const loading = driversQuery.isLoading || constructorsQuery.isLoading || scheduleQuery.isLoading;

  const refreshing =
    driversQuery.isRefetching || constructorsQuery.isRefetching || scheduleQuery.isRefetching;

  const refetchAll = async () => {
    await Promise.all([
      driversQuery.refetch(),
      constructorsQuery.refetch(),
      scheduleQuery.refetch(),
    ]);
  };

  return {
    loading,
    refreshing,
    season: driversQuery.data?.season ?? new Date().getFullYear(),
    driversStandings: driversQuery.data?.standings ?? [],
    constructorsStandings: constructorsQuery.data ?? [],
    raceSchedule: scheduleQuery.data ?? [],
    refetchAll,
    // Expose dataUpdatedAt for "last updated" display
    lastUpdated: driversQuery.dataUpdatedAt ? new Date(driversQuery.dataUpdatedAt) : null,
  };
}
