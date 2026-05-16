/**
 * Driver comparison page data hook — TanStack Query migration.
 *
 * Fetches all drivers list and the comparison between two selected drivers.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useAllDrivers() {
  return useQuery({
    queryKey: ["/drivers/all"],
    queryFn: async () => {
      const res = await apiClient.get("/drivers/all");
      return res.data;
    },
  });
}

export function useDriverComparison(
  driver1Id: string,
  driver2Id: string
) {
  return useQuery({
    queryKey: ["/drivers/compare", driver1Id, driver2Id],
    queryFn: async () => {
      const res = await apiClient.get(
        `/drivers/compare?driver1=${driver1Id}&driver2=${driver2Id}`
      );
      return res.data;
    },
    enabled: !!driver1Id && !!driver2Id && driver1Id !== driver2Id,
  });
}
