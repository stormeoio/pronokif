/**
 * Driver comparison page data hook — TanStack Query migration.
 *
 * Fetches all drivers list and the comparison between two selected drivers.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DriverDetails, DriverComparison } from "@/types/api";

export function useAllDrivers() {
  return useQuery({
    queryKey: ["/drivers/all"],
    queryFn: (): Promise<DriverDetails[]> => api.drivers.all(),
  });
}

export function useDriverComparison(driver1Id: string, driver2Id: string) {
  return useQuery({
    queryKey: ["/drivers/compare", driver1Id, driver2Id],
    queryFn: (): Promise<DriverComparison> => api.drivers.compare(driver1Id, driver2Id),
    enabled: !!driver1Id && !!driver2Id && driver1Id !== driver2Id,
  });
}
