/**
 * PredictionsPage — component tests.
 *
 * Covers: loading state, API calls with correct raceId.
 * Note: PredictionsPage expects a `raceId` route param.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/auth";
import { mockAuthValue, mockUser } from "@/test/utils";

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/api", () => {
  const unwrap = (p: Promise<{ data: unknown }>) => p.then((r) => r.data);
  return {
    apiClient: mockApiClient,
    API: "http://localhost:8000/api",
    api: {
      races: {
        get: (id: string) => unwrap(mockApiClient.get(`/races/${id}`)),
      },
      drivers: {
        list: () => unwrap(mockApiClient.get("/drivers")),
      },
      predictions: {
        get: (raceId: string) => unwrap(mockApiClient.get(`/predictions/race/${raceId}`)),
        saveSprint: (body: unknown) => unwrap(mockApiClient.post("/predictions/sprint", body)),
        saveMain: (body: unknown) => unwrap(mockApiClient.post("/predictions/main", body)),
        delete: (raceId: string) => unwrap(mockApiClient.delete(`/predictions/race/${raceId}`)),
      },
    },
    getApiError: (e: unknown, fallback = "Erreur") => {
      const err = e as { response?: { data?: { detail?: string } } };
      return err.response?.data?.detail || fallback;
    },
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import PredictionsPage from "./PredictionsPage";

const mockedApi = mockApiClient;

const mockRace = {
  id: "race-1",
  name: "Grand Prix de Monaco",
  circuit: "Circuit de Monaco",
  date: "2026-05-25",
  round: 6,
  predictions_close: "2026-05-25T13:00:00Z",
  is_sprint_weekend: false,
  status: "upcoming",
};

const mockDrivers = [
  { id: "d1", name: "Max Verstappen", team: "Red Bull Racing", number: 1 },
  { id: "d2", name: "Lando Norris", team: "McLaren", number: 4 },
];

function renderPredictions() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter initialEntries={["/predictions/race-1"]}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue(mockUser)}>
          <Routes>
            <Route path="/predictions/:raceId" element={<PredictionsPage />} />
          </Routes>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/races/race-1") {
      return Promise.resolve({ data: mockRace });
    }
    if (url === "/drivers") {
      return Promise.resolve({ data: mockDrivers });
    }
    if (url === "/predictions/race/race-1") {
      return Promise.resolve({ data: null });
    }
    if (url.includes("/minigames/")) {
      return Promise.resolve({ data: [] });
    }
    return Promise.resolve({ data: null });
  });
});

describe("PredictionsPage", () => {
  it("shows skeleton loading state initially", () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));
    renderPredictions();

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("fetches race data with correct raceId", async () => {
    renderPredictions();

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith("/races/race-1");
      expect(mockedApi.get).toHaveBeenCalledWith("/drivers");
    });
  });

  it("renders race name after data loads", async () => {
    renderPredictions();

    await waitFor(() => {
      expect(screen.getByText(/monaco/i)).toBeInTheDocument();
    });
  });
});
