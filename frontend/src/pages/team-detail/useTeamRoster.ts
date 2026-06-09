import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { JOLPICA_API } from "../championship/championshipUtils";
import { getTeamMeta, teamKeyFor, type TeamMeta } from "@/lib/teamLogos";

export interface RosterTeam {
  id: string;
  name: string;
  nationality: string;
  meta: TeamMeta;
}

export function useTeamRoster() {
  const query = useQuery({
    queryKey: ["jolpica", "constructorstandings"],
    queryFn: async () => {
      const res = await fetch(`${JOLPICA_API}/current/constructorstandings.json`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
      return list?.ConstructorStandings ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const roster = useMemo<RosterTeam[]>(() => {
    if (!query.data) return [];
    return (query.data as any[]).map((entry) => {
      const c = entry.Constructor;
      return {
        id: c.constructorId,
        name: c.name,
        nationality: c.nationality,
        meta: getTeamMeta(c.name),
      };
    });
  }, [query.data]);

  return { roster, loading: query.isLoading };
}

export function resolveTeamId(teamId: string | undefined): string | null {
  if (!teamId) return null;
  return teamKeyFor(teamId) ?? teamId;
}
