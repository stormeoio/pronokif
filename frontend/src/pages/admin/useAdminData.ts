/**
 * Admin data hook — TanStack Query migration.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAdminData() {
  const racesQuery = useQuery({
    queryKey: ["/admin/races"],
    queryFn: () => api.admin.races() as Promise<any>,
    retry: false, // 403 = not admin, don't retry
  });

  const driversQuery = useQuery({
    queryKey: ["/drivers"],
    queryFn: () => api.drivers.list(),
    enabled: racesQuery.isSuccess, // only fetch if admin check passed
  });

  const is403 =
    racesQuery.error &&
    typeof racesQuery.error === "object" &&
    "response" in racesQuery.error &&
    (racesQuery.error as { response?: { status?: number } }).response?.status === 403;

  return {
    loading: racesQuery.isLoading,
    isAdmin: racesQuery.isSuccess,
    isAccessDenied: is403,
    races: racesQuery.data ?? [],
    drivers: driversQuery.data ?? [],
    refetchRaces: racesQuery.refetch,
  };
}
