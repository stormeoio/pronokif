import { useQuery } from "@tanstack/react-query";
import { JOLPICA_API } from "../championship/championshipUtils";
import { getTeamMeta, type TeamMeta } from "@/lib/teamLogos";
import { api } from "@/lib/api";

interface ConstructorStanding {
  position: string;
  points: string;
  wins: string;
  Constructor: {
    constructorId: string;
    name: string;
    nationality: string;
    url: string;
  };
}

export interface TeamDetail {
  id: string;
  name: string;
  nationality: string;
  position: number;
  points: number;
  wins: number;
  meta: TeamMeta;
  wikiUrl?: string;
}

export interface TeamDriver {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  team: string;
  team_id?: string;
  photo_url?: string;
  photo_url_dark?: string;
  photo_url_light?: string;
  country_name?: string;
}

export function useTeamDetailData(teamId: string | undefined) {
  const standingsQuery = useQuery({
    queryKey: ["jolpica", "constructorstandings"],
    queryFn: async () => {
      const res = await fetch(`${JOLPICA_API}/current/constructorstandings.json`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const list = data?.MRData?.StandingsTable?.StandingsLists?.[0];
      return (list?.ConstructorStandings ?? []) as ConstructorStanding[];
    },
    staleTime: 5 * 60_000,
  });

  const driversQuery = useQuery({
    queryKey: ["drivers", "all-photos"],
    queryFn: () => api.drivers.all() as Promise<TeamDriver[]>,
    staleTime: 5 * 60_000,
  });

  const standing = standingsQuery.data?.find((s) => s.Constructor.constructorId === teamId);

  const team: TeamDetail | null = standing
    ? {
        id: standing.Constructor.constructorId,
        name: standing.Constructor.name,
        nationality: standing.Constructor.nationality,
        position: parseInt(standing.position),
        points: parseFloat(standing.points),
        wins: parseInt(standing.wins),
        meta: getTeamMeta(standing.Constructor.name),
        wikiUrl: standing.Constructor.url,
      }
    : null;

  const teamDrivers = (driversQuery.data ?? []).filter((d) => {
    if (!teamId) return false;
    const dTeamKey = (d.team_id || d.team || "").toLowerCase().replace(/[\s_]+/g, "-");
    const tKey = teamId.toLowerCase().replace(/[\s_]+/g, "-");
    if (dTeamKey === tKey) return true;
    const meta = team?.meta;
    if (meta && meta.name) {
      const dTeam = (d.team || "").toLowerCase();
      const tName = meta.name.toLowerCase();
      if (dTeam === tName || dTeam.includes(tName) || tName.includes(dTeam)) return true;
    }
    return false;
  });

  return {
    loading: standingsQuery.isLoading || driversQuery.isLoading,
    team,
    drivers: teamDrivers,
    error: standingsQuery.error || driversQuery.error,
  };
}
