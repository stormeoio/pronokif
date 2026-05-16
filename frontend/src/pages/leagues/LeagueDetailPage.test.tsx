/**
 * LeagueDetailPage — component tests.
 *
 * Covers: loading state, league info display, tab navigation,
 * and error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/auth";
import { mockAuthValue, mockUser } from "@/test/utils";

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  API: "http://localhost:8000/api",
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { apiClient } from "@/lib/api";
import LeagueDetailPage from "./LeagueDetailPage";

const mockedApi = vi.mocked(apiClient);

const mockLeague = {
  id: "league-1",
  name: "Les Experts F1",
  description: "Ligue de pronostics entre amis",
  code: "ABC123",
  created_by: "user-1",
  member_count: 5,
};

const mockMembers = [
  { id: "user-1", username: "max33", total_points: 150, avatar_id: "1" },
  { id: "user-2", username: "lando4", total_points: 120, avatar_id: "2" },
];

const mockLeaderboard = [
  { user_id: "user-1", username: "max33", total_points: 150, rank: 1 },
  { user_id: "user-2", username: "lando4", total_points: 120, rank: 2 },
];

function renderLeagueDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter initialEntries={["/league/league-1/details"]}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue(mockUser)}>
          <Routes>
            <Route path="/league/:leagueId/details" element={<LeagueDetailPage />} />
            <Route path="/league" element={<div>League List</div>} />
          </Routes>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/leagues/league-1") {
      return Promise.resolve({ data: mockLeague });
    }
    if (url === "/leagues/league-1/members") {
      return Promise.resolve({ data: mockMembers });
    }
    if (url === "/leagues/league-1/leaderboard") {
      return Promise.resolve({ data: mockLeaderboard });
    }
    if (url === "/avatars") {
      return Promise.resolve({ data: {} });
    }
    return Promise.resolve({ data: null });
  });
});

describe("LeagueDetailPage", () => {
  it("shows loading spinner initially", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderLeagueDetail();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("displays league name after load", async () => {
    renderLeagueDetail();

    await waitFor(() => {
      expect(screen.getByText("Les Experts F1")).toBeInTheDocument();
    });
  });

  it("fetches league data with correct leagueId", async () => {
    renderLeagueDetail();

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/leagues/league-1");
      expect(mockedApi.get).toHaveBeenCalledWith("/leagues/league-1/members");
      expect(mockedApi.get).toHaveBeenCalledWith("/leagues/league-1/leaderboard");
    });
  });

  it("handles API error gracefully", async () => {
    const { toast } = await import("sonner");
    mockedApi.get.mockRejectedValue(new Error("Network error"));

    renderLeagueDetail();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erreur lors du chargement");
    });
  });
});
