/**
 * Driver comparison page data hook — TanStack Query migration.
 *
 * Fetches all drivers list and the comparison between two selected drivers.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAllDrivers() {
  return useQuery({
    queryKey: ["/drivers/all"],
    queryFn: () => api.drivers.all() as Promise<any>,
  });
}

export function useDriverComparison(driver1Id: string, driver2Id: string) {
  return useQuery({
    queryKey: ["/drivers/compare", driver1Id, driver2Id],
    queryFn: () => api.drivers.compare(driver1Id, driver2Id) as Promise<any>,
    enabled: !!driver1Id && !!driver2Id && driver1Id !== driver2Id,
  });
}
