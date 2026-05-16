/**
 * Admin data hook — TanStack Query migration.
 */
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useAdminData() {
  const racesQuery = useQuery({
    queryKey: ["/admin/races"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/races");
      return res.data;
    },
    retry: false, // 403 = not admin, don't retry
  });

  const driversQuery = useQuery({
    queryKey: ["/drivers"],
    queryFn: async () => {
      const res = await apiClient.get("/drivers");
      return res.data;
    },
    enabled: racesQuery.isSuccess, // only fetch if admin check passed
  });

  const is403 =
    racesQuery.error &&
    typeof racesQuery.error === "object" &&
    "response" in racesQuery.error &&
    (racesQuery.error as any).response?.status === 403;

  return {
    loading: racesQuery.isLoading,
    isAdmin: racesQuery.isSuccess,
    isAccessDenied: is403,
    races: racesQuery.data ?? [],
    drivers: driversQuery.data ?? [],
    refetchRaces: racesQuery.refetch,
  };
}
