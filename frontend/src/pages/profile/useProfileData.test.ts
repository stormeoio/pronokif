/**
 * useProfileData hook tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

vi.mock("@/lib/api", () => ({
  api: {
    leagues: { my: vi.fn(), leaderboard: vi.fn() },
    predictions: { stats: vi.fn(), pointsHistory: vi.fn() },
    avatars: { list: vi.fn() },
    leaderboard: { global: vi.fn() },
  },
}));

import { useProfileData } from "./useProfileData";
import { api } from "@/lib/api";

const mockApi = api as any;

function createWrapper(queryClient?: QueryClient) {
  const qc =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.leagues.my.mockResolvedValue([{ id: "l1", name: "My League" }]);
  mockApi.predictions.stats.mockResolvedValue({ total_predictions: 12, races_participated: 3 });
  mockApi.avatars.list.mockResolvedValue({ all: [{ id: "av1", name: "Pilot" }] });
  mockApi.leaderboard.global.mockResolvedValue({ my_position: 5 });
  mockApi.predictions.pointsHistory.mockResolvedValue({
    history: [{ race: "r1", points: 42 }],
    summary: { total_points: 42 },
  });
  mockApi.leagues.leaderboard.mockResolvedValue([
    { user_id: "u1", total_points: 100 },
    { user_id: "u2", total_points: 80 },
  ]);
});

describe("useProfileData", () => {
  it("returns loading=true initially, then resolves data", async () => {
    const { result } = renderHook(() => useProfileData("u1", "l1"), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.leagues).toEqual([{ id: "l1", name: "My League" }]);
    expect(result.current.stats.totalPredictions).toBe(12);
    expect(result.current.stats.racesParticipated).toBe(3);
    expect(result.current.globalPosition).toBe(5);
  });

  it("does not reuse dashboard cached global leaderboard object as globalPosition", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["/leaderboard/global"], {
      leaderboard: [],
      my_position: 9,
      total_players: 12,
    });

    const { result } = renderHook(() => useProfileData("u1", "l1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.globalPosition).toBe(5));
  });

  it("returns totalPoints from league leaderboard when available", async () => {
    const { result } = renderHook(() => useProfileData("u1", "l1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.stats.totalPoints).toBe(100));
  });

  it("accepts wrapped leaderboard responses when computing totalPoints", async () => {
    mockApi.leagues.leaderboard.mockResolvedValue({
      leaderboard: [
        { user_id: "u1", total_points: 140 },
        { user_id: "u2", total_points: 80 },
      ],
      my_position: 1,
      total_players: 2,
    });

    const { result } = renderHook(() => useProfileData("u1", "l1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.stats.totalPoints).toBe(140));
  });

  it("does not expose malformed total_points objects to the UI", async () => {
    mockApi.leagues.leaderboard.mockResolvedValue([]);
    mockApi.predictions.pointsHistory.mockResolvedValue({
      history: [],
      summary: { total_points: { leaderboard: [], my_position: null, total_players: 0 } },
    });

    const { result } = renderHook(() => useProfileData("u1", null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats.totalPoints).toBe(0);
  });

  it("falls back to history summary when no leagueId", async () => {
    const { result } = renderHook(() => useProfileData("u1", null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats.totalPoints).toBe(42);
    expect(mockApi.leagues.leaderboard).not.toHaveBeenCalled();
  });

  it("returns avatars data", async () => {
    const { result } = renderHook(() => useProfileData("u1", "l1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.avatars).not.toBeNull());
    expect(result.current.avatars).toEqual({ all: [{ id: "av1", name: "Pilot" }] });
  });
});
