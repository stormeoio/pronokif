/**
 * PredictionsPage — component tests.
 *
 * Covers: loading state, API calls with correct raceId.
 * Note: PredictionsPage expects a `raceId` route param.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PredictionsPage from "./PredictionsPage";
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

vi.mock("@/components/RewardCelebration", () => ({
  default: () => null,
}));

vi.mock("./DeleteConfirmModal", () => ({
  DeleteConfirmModal: ({
    raceName,
    deleting,
    onConfirm,
    onCancel,
  }: {
    raceName: string;
    deleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div role="dialog" aria-label="Supprimer les pronostics">
      <p>{raceName}</p>
      <button type="button" onClick={onConfirm} disabled={deleting}>
        {deleting ? "Suppression..." : "Supprimer"}
      </button>
      <button type="button" onClick={onCancel} disabled={deleting}>
        Annuler
      </button>
    </div>
  ),
}));

const mockedApi = mockApiClient;

const mockRace = {
  id: "race-1",
  name: "Grand Prix de Monaco",
  circuit: "Circuit de Monaco",
  date: "2026-05-25",
  round: 6,
  predictions_close: "2026-05-25T13:00:00Z",
  can_predict: true,
  can_predict_sprint: true,
  is_sprint_weekend: false,
  status: "upcoming",
};

const mockDrivers = Array.from({ length: 10 }, (_, index) => ({
  id: `d${index + 1}`,
  name:
    [
      "Max Verstappen",
      "Lando Norris",
      "Charles Leclerc",
      "George Russell",
      "Oscar Piastri",
      "Lewis Hamilton",
      "Kimi Antonelli",
      "Pierre Gasly",
      "Carlos Sainz",
      "Alexander Albon",
    ][index] ?? `Driver ${index + 1}`,
  team: index % 2 === 0 ? "McLaren" : "Mercedes",
  number: index + 1,
}));

let raceResponse = mockRace;
let predictionResponse: unknown = null;

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
  raceResponse = mockRace;
  predictionResponse = null;
  mockedApi.get.mockImplementation((url: string) => {
    if (url === "/races/race-1") {
      return Promise.resolve({ data: raceResponse });
    }
    if (url === "/drivers") {
      return Promise.resolve({ data: mockDrivers });
    }
    if (url === "/predictions/race/race-1") {
      return Promise.resolve({ data: predictionResponse });
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

  it("uses a vertical accordion pipeline for main race steps", async () => {
    const user = userEvent.setup();
    renderPredictions();

    expect(await screen.findByTestId("prediction-step-accordion")).toBeInTheDocument();
    expect(screen.getByTestId("stage-qualifying")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("step-quali_pole")).toBeInTheDocument();

    expect(screen.getByTestId("stage-race")).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByTestId("stage-race"));

    expect(screen.getByTestId("stage-race")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("step-race_winner")).toBeInTheDocument();
    expect(screen.getByTestId("step-race_top10")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId("step-quali_pole")).not.toBeInTheDocument();
    });
  });

  it("starts sprint weekends on the sprint accordion pipeline", async () => {
    raceResponse = { ...mockRace, is_sprint_weekend: true };
    renderPredictions();

    expect(await screen.findByTestId("tab-sprint")).toBeEnabled();
    expect(screen.getByTestId("stage-qualifying")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("step-sprint_quali_pole")).toBeInTheDocument();
    expect(screen.getByTestId("step-sprint_quali_top10")).toBeInTheDocument();
  });

  it("lets a user complete and save the main race pipeline", async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { ok: true } });
    renderPredictions();

    await screen.findByTestId("driver-d1");
    expect(screen.getByTestId("prediction-bottom-progress")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByTestId("prediction-bottom-progress-count")).toHaveTextContent("0/4");

    await user.click(screen.getByTestId("driver-d1"));
    expect(screen.getByTestId("step-quali_top10")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("prediction-bottom-progress")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByTestId("prediction-bottom-progress-count")).toHaveTextContent("1/4");

    for (const driver of mockDrivers) {
      await user.click(screen.getByTestId(`driver-${driver.id}`));
    }

    await waitFor(() => {
      expect(screen.getByTestId("stage-race")).toHaveAttribute("aria-expanded", "true");
    });
    expect(screen.getByTestId("prediction-bottom-progress")).toHaveAttribute("aria-valuenow", "2");
    expect(screen.getByTestId("prediction-bottom-progress-count")).toHaveTextContent("2/4");
    expect(screen.getByTestId("step-race_winner")).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByTestId("driver-d2"));
    expect(screen.getByTestId("step-race_top10")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("prediction-bottom-progress")).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByTestId("prediction-bottom-progress-count")).toHaveTextContent("3/4");

    for (const driver of mockDrivers) {
      await user.click(screen.getByTestId(`driver-${driver.id}`));
    }

    await waitFor(() => {
      expect(screen.getByTestId("stage-bonus")).toHaveAttribute("aria-expanded", "true");
    });
    expect(screen.getByTestId("prediction-bottom-progress")).toHaveAttribute("aria-valuenow", "4");
    expect(screen.getByTestId("prediction-bottom-progress-count")).toHaveTextContent("4/4");
    await user.click(screen.getByTestId("bonus-safety-car-yes"));
    await user.click(screen.getByTestId("bonus-fastest-lap"));
    await user.click(screen.getByTestId("driver-d3"));
    await waitFor(() => {
      expect(screen.getByTestId("bonus-fastest-lap")).toHaveTextContent(/charles leclerc/i);
    });

    await user.click(screen.getByTestId("bonus-first-corner"));
    await user.click(screen.getByTestId("driver-d4"));
    await waitFor(() => {
      expect(screen.getByTestId("bonus-first-corner")).toHaveTextContent(/george russell/i);
    });

    await user.click(screen.getByTestId("bonus-no-dnf"));
    await user.click(screen.getByTestId("save-predictions-btn"));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/predictions/main",
        expect.objectContaining({
          race_id: "race-1",
          quali_pole: "d1",
          quali_top10: mockDrivers.map((driver) => driver.id),
          race_winner: "d2",
          race_top10: mockDrivers.map((driver) => driver.id),
          bonus_bets: {
            safety_car: true,
            dnf_drivers: [],
            no_dnf: true,
            fastest_lap_driver: "d3",
            first_corner_leader: "d4",
          },
        }),
      );
    });
  });

  it("scrolls the wizard when a completed top 10 advances to the next stage", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      renderPredictions();

      await screen.findByTestId("driver-d1");
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      await user.click(screen.getByTestId("driver-d1"));
      await waitFor(() => {
        expect(screen.getByTestId("step-quali_top10")).toHaveAttribute("aria-selected", "true");
      });

      scrollIntoView.mockClear();

      for (const driver of mockDrivers) {
        await user.click(screen.getByTestId(`driver-${driver.id}`));
      }

      await waitFor(() => {
        expect(screen.getByTestId("stage-race")).toHaveAttribute("aria-expanded", "true");
      });
      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
      });
    } finally {
      if (originalScrollIntoView) {
        Object.defineProperty(Element.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(Element.prototype, "scrollIntoView");
      }
    }
  });

  it("lets a user complete and save the sprint pipeline", async () => {
    const user = userEvent.setup();
    raceResponse = { ...mockRace, is_sprint_weekend: true };
    mockedApi.post.mockResolvedValue({ data: { ok: true } });
    renderPredictions();

    await screen.findByTestId("driver-d1");
    await user.click(screen.getByTestId("driver-d1"));
    expect(screen.getByTestId("step-sprint_quali_top10")).toHaveAttribute("aria-selected", "true");

    for (const driver of mockDrivers) {
      await user.click(screen.getByTestId(`driver-${driver.id}`));
    }

    await waitFor(() => {
      expect(screen.getByTestId("stage-race")).toHaveAttribute("aria-expanded", "true");
    });
    expect(screen.getByTestId("step-sprint_race_winner")).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByTestId("driver-d2"));
    expect(screen.getByTestId("step-sprint_race_top10")).toHaveAttribute("aria-selected", "true");

    for (const driver of mockDrivers) {
      await user.click(screen.getByTestId(`driver-${driver.id}`));
    }

    await waitFor(() => {
      expect(screen.getByTestId("stage-bonus")).toHaveAttribute("aria-expanded", "true");
    });
    await user.click(screen.getByTestId("bonus-safety-car-no"));
    await user.click(screen.getByTestId("bonus-fastest-lap"));
    await user.click(screen.getByTestId("driver-d5"));
    await waitFor(() => {
      expect(screen.getByTestId("bonus-fastest-lap")).toHaveTextContent(/oscar piastri/i);
    });

    await user.click(screen.getByTestId("bonus-first-corner"));
    await user.click(screen.getByTestId("driver-d6"));
    await waitFor(() => {
      expect(screen.getByTestId("bonus-first-corner")).toHaveTextContent(/lewis hamilton/i);
    });

    await user.click(screen.getByTestId("bonus-no-dnf"));
    await user.click(screen.getByTestId("save-predictions-btn"));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/predictions/sprint",
        expect.objectContaining({
          race_id: "race-1",
          sprint_quali_pole: "d1",
          sprint_quali_top10: mockDrivers.map((driver) => driver.id),
          sprint_race_winner: "d2",
          sprint_race_top10: mockDrivers.map((driver) => driver.id),
          sprint_bonus_bets: {
            safety_car: false,
            dnf_drivers: [],
            no_dnf: true,
            fastest_lap_driver: "d5",
            first_corner_leader: "d6",
          },
        }),
      );
    });
  });

  it("hydrates and deletes an existing prediction", async () => {
    const user = userEvent.setup();
    predictionResponse = {
      id: "prediction-1",
      race_id: "race-1",
      quali_pole: "d1",
      quali_top10: mockDrivers.map((driver) => driver.id),
      race_winner: "d2",
      race_top10: mockDrivers.map((driver) => driver.id),
      bonus_bets: {
        safety_car: true,
        dnf_drivers: [],
        no_dnf: true,
        fastest_lap_driver: "d3",
        first_corner_leader: "d4",
      },
    };
    mockedApi.delete.mockResolvedValue({ data: { ok: true } });
    renderPredictions();

    expect((await screen.findAllByText(/sauv[eé]|enregistr[eé]/i)).length).toBeGreaterThan(0);
    expect(screen.getByTestId("stage-qualifying")).toHaveTextContent("2/2");
    expect(screen.getByTestId("driver-d1")).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByTestId("delete-predictions-btn"));
    const dialog = screen.getByRole("dialog", { name: /supprimer les pronostics/i });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /supprimer/i }));

    await waitFor(() => {
      expect(mockedApi.delete).toHaveBeenCalledWith("/predictions/race/race-1");
      expect(screen.queryByText(/sauv[eé]|enregistr[eé]/i)).not.toBeInTheDocument();
    });
  });
});
