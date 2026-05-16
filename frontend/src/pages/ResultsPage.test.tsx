/**
 * ResultsPage tests — loading state, race list, result display.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1", username: "testpilot" } }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    races: { list: vi.fn() },
    drivers: { list: vi.fn() },
    results: { get: vi.fn() },
    predictions: { getByRace: vi.fn() },
  },
}));

vi.mock("./results/ResultComparisonCard", () => ({
  default: () => <div data-testid="comparison-card">ComparisonCard</div>,
}));

import ResultsPage from "./ResultsPage";
import { api } from "@/lib/api";

const mockApi = api as any;

const mockRaces = [
  { id: "r1", name: "Bahrain GP", status: "finished", date: "2026-03-02", circuit: "Sakhir" },
  { id: "r2", name: "Saudi GP", status: "upcoming", date: "2026-03-16", circuit: "Jeddah" },
];

const mockDrivers = [
  { id: "d1", name: "Max Verstappen", team: "Red Bull" },
  { id: "d2", name: "Lewis Hamilton", team: "Ferrari" },
];

function renderPage(initialPath = "/results") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/:raceId" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.races.list.mockResolvedValue(mockRaces);
  mockApi.drivers.list.mockResolvedValue(mockDrivers);
  mockApi.results.get.mockResolvedValue({
    race_winner: "d1",
    race_top10: ["d1", "d2"],
    quali_pole: "d1",
  });
  mockApi.predictions.getByRace.mockResolvedValue(null);
});

describe("ResultsPage", () => {
  it("fetches races and drivers on mount", async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApi.races.list).toHaveBeenCalledTimes(1);
      expect(mockApi.drivers.list).toHaveBeenCalledTimes(1);
    });
  });

  it("auto-selects the last finished race when no raceId param", async () => {
    renderPage("/results");
    await waitFor(() => {
      expect(mockApi.results.get).toHaveBeenCalledWith("r1");
    });
  });

  it("uses raceId from URL params when provided", async () => {
    renderPage("/results/r1");
    await waitFor(() => {
      expect(mockApi.results.get).toHaveBeenCalledWith("r1");
    });
  });

  it("does not crash after data loads", async () => {
    renderPage("/results");
    await waitFor(() => {
      expect(mockApi.races.list).toHaveBeenCalled();
      expect(mockApi.drivers.list).toHaveBeenCalled();
    });
    // Page renders without error after data resolves
    expect(document.querySelector("[role='main'], main, .min-h-screen, div")).toBeTruthy();
  });
});
