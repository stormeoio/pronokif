/**
 * MiniGamesPage tests — rendering, tab switching, mode toggle.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1", username: "testpilot", avatar_id: "av1" } }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    leagues: { my: vi.fn() },
    races: { next: vi.fn() },
    avatars: { list: vi.fn() },
    minigames: {
      globalLeaderboard: vi.fn(),
      leaderboard: vi.fn(),
      attempts: vi.fn(),
      submitReaction: vi.fn(),
      submitBatak: vi.fn(),
    },
  },
}));

vi.mock("../components/mini-games/MiniGames", () => ({
  ReactionGame: ({ onResult }: any) => (
    <div data-testid="reaction-game">
      <button onClick={() => onResult(250)}>Play</button>
    </div>
  ),
  BatakGame: ({ onResult }: any) => (
    <div data-testid="batak-game">
      <button onClick={() => onResult(10, 30)}>Play</button>
    </div>
  ),
}));

import MiniGamesPage from "./MiniGamesPage";
import { api } from "@/lib/api";

const mockApi = api as any;

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MiniGamesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.leagues.my.mockResolvedValue([{ id: "l1", name: "League" }]);
  mockApi.races.next.mockResolvedValue({ id: "race1", name: "Bahrain GP" });
  mockApi.avatars.list.mockResolvedValue({ all: [] });
  mockApi.minigames.globalLeaderboard.mockResolvedValue({ leaderboard: [] });
  mockApi.minigames.leaderboard.mockResolvedValue({ leaderboard: [] });
  mockApi.minigames.attempts.mockResolvedValue({ attempts_used: 1, attempts_remaining: 2 });
});

describe("MiniGamesPage", () => {
  it("renders without crashing", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApi.races.next).toHaveBeenCalled();
    });
  });

  it("shows reaction game tab by default", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("reaction-game")).toBeInTheDocument();
    });
  });

  it("switches to batak tab on click", async () => {
    renderPage();
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByTestId("reaction-game")).toBeInTheDocument();
    });

    const batakTab = screen.getByText(/Batak/i);
    await user.click(batakTab);

    await waitFor(() => {
      expect(screen.getByTestId("batak-game")).toBeInTheDocument();
    });
  });

  it("shows training mode by default", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/entrainement/i).length).toBeGreaterThan(0);
    });
  });
});
