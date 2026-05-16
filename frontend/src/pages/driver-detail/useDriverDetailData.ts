/**
 * Driver detail page data hook — TanStack Query migration.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useDriverDetailData(driverId: string | undefined) {
  const driverQuery = useQuery({
    queryKey: ["/drivers", driverId, "details"],
    queryFn: async () => {
      const res = await apiClient.get(`/drivers/${driverId}/details`);
      return res.data;
    },
    enabled: !!driverId,
  });

  return {
    loading: driverQuery.isLoading,
    driver: driverQuery.data ?? null,
    error: driverQuery.error,
  };
}
