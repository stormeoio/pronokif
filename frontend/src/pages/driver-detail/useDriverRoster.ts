/**
 * useDriverRoster — ordered driver grid used by the detail page sidebar rail
 * and the swipe / prev-next navigation.
 *
 * Ordering is "écurie-aware": teammates are kept adjacent (teams in the order
 * the API returns them, drivers sorted by race number within a team). Sliding
 * left/right therefore walks through a team before moving to the next one.
 *
 * Shares the same query key as DriverStandings (`["drivers", "all-photos"]`)
 * so the roster is fetched once and reused across the app.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface RosterDriver {
  id: string;
  first_name: string;
  last_name: string;
  number: number;
  team: string;
  team_id?: string;
  photo_url?: string;
  photo_url_dark?: string;
  photo_url_light?: string;
}

function orderRoster(drivers: RosterDriver[]): RosterDriver[] {
  // Preserve the API's team order, but keep teammates grouped together.
  const teamOrder: string[] = [];
  for (const d of drivers) {
    const key = d.team_id || d.team || "";
    if (!teamOrder.includes(key)) teamOrder.push(key);
  }
  return [...drivers].sort((a, b) => {
    const ta = teamOrder.indexOf(a.team_id || a.team || "");
    const tb = teamOrder.indexOf(b.team_id || b.team || "");
    if (ta !== tb) return ta - tb;
    return (a.number ?? 999) - (b.number ?? 999);
  });
}

export function useDriverRoster() {
  const query = useQuery({
    queryKey: ["drivers", "all-photos"],
    queryFn: () => api.drivers.all() as Promise<RosterDriver[]>,
    staleTime: 5 * 60 * 1000,
  });

  const roster = useMemo(() => (query.data ? orderRoster(query.data) : []), [query.data]);

  return { roster, loading: query.isLoading };
}
