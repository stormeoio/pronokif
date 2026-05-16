/**
 * Driver detail page data hook — TanStack Query migration.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDriverDetailData(driverId: string | undefined) {
  const driverQuery = useQuery({
    queryKey: ["/drivers", driverId, "details"],
    queryFn: () => api.drivers.details(driverId!) as Promise<any>,
    enabled: !!driverId,
  });

  return {
    loading: driverQuery.isLoading,
    driver: driverQuery.data ?? null,
    error: driverQuery.error,
  };
}
