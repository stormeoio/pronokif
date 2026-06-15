/**
 * GrandPrixDetailPage — Pronos tab behaviour.
 *
 * Proves the requirement: in the Pronos tab a user who has predicted finds their
 * picks recap and can modify them while predictions are open; once the race is
 * finished they get a recap + a link to the full results.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import GrandPrixDetailPage from "./GrandPrixDetailPage";
import { AuthContext } from "@/lib/auth";
import { mockAuthValue } from "@/test/utils";
import { api } from "@/lib/api";
import type { Driver, Prediction } from "@/types/api";

vi.mock("@/lib/api", () => ({
  api: {
    races: { details: vi.fn() },
    predictions: { get: vi.fn() },
    drivers: { list: vi.fn() },
  },
}));

// Stub heavy children — this test only exercises the Pronos tab branch logic.
vi.mock("@/components/RaceDetailHero", () => ({ default: () => <div data-testid="hero" /> }));
vi.mock("@/components/CircuitMap", () => ({ CircuitMap: () => <div data-testid="circuit-map" /> }));
vi.mock("@/components/StartingGrid", () => ({ default: () => <div data-testid="grid" /> }));
vi.mock("@/components/RaceLiveResults", () => ({
  default: () => <div data-testid="live-results" />,
}));

const DRIVERS: Driver[] = [
  ["d1", "VER", "Verstappen"],
  ["d2", "NOR", "Norris"],
].map(([id, code, last]) => ({
  id,
  code,
  name: last,
  first_name: "",
  last_name: last,
  team: "",
  number: 0,
  country: "",
  photo_url: "",
}));

const PREDICTION: Prediction = {
  id: "p1",
  user_id: "user-1",
  race_id: "race-1",
  quali_pole: "d1",
  quali_top10: ["d1", "d2"],
  sprint_quali_top10: null,
  sprint_race_top10: null,
  race_winner: "d2",
  race_top10: ["d2", "d1"],
  bonus_bets: null,
  sprint_bonus_bets: null,
  custom_predictions: null,
  locked: false,
  created_at: "",
  updated_at: "",
};

const baseRace: Record<string, unknown> = {
  id: "race-1",
  name: "Grand Prix de Monaco",
  country: "Monaco",
  status: "upcoming",
  can_predict: true,
  can_predict_sprint: false,
  is_sprint_weekend: false,
  is_cancelled: false,
  predictions_close_at: "2026-05-25T13:00:00Z",
  race_start_at: "2026-05-25T13:00:00Z",
  circuit: {
    name: "Monaco",
    full_name: "Circuit de Monaco",
    length_km: 3.337,
    turns: 19,
    laps: 78,
  },
  circuit_map: null,
  sessions: {},
};

function setup(raceOverrides: Record<string, unknown>, prediction: Prediction | null) {
  (api.races.details as ReturnType<typeof vi.fn>).mockResolvedValue({
    ...baseRace,
    ...raceOverrides,
  });
  (api.predictions.get as ReturnType<typeof vi.fn>).mockResolvedValue(prediction);
  (api.drivers.list as ReturnType<typeof vi.fn>).mockResolvedValue(DRIVERS);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter initialEntries={["/race/race-1"]}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue()}>
          <Routes>
            <Route path="/race/:raceId" element={<GrandPrixDetailPage />} />
          </Routes>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("GrandPrixDetailPage — Pronos tab", () => {
  it("shows the picks recap + 'Modifier' when predictions are open and the user has played", async () => {
    setup({}, PREDICTION);
    const user = userEvent.setup();

    await screen.findByTestId("grandprix-detail-page");
    await user.click(await screen.findByTestId("gp-tab-picks"));

    expect(await screen.findByTestId("prediction-summary")).toBeInTheDocument();
    const cta = await screen.findByTestId("make-predictions-cta");
    expect(cta.textContent).toContain("Modifier mes pronos");
  });

  it("shows the plain 'Faire mes pronos' CTA when the user has not predicted", async () => {
    setup({}, null);
    const user = userEvent.setup();

    await screen.findByTestId("grandprix-detail-page");
    await user.click(await screen.findByTestId("gp-tab-picks"));

    expect(screen.queryByTestId("prediction-summary")).not.toBeInTheDocument();
    const cta = await screen.findByTestId("make-predictions-cta");
    expect(cta.textContent).toContain("Faire mes pronos");
  });

  it("shows the recap + 'Voir les résultats' once the race is finished", async () => {
    setup({ status: "finished", can_predict: false }, PREDICTION);
    const user = userEvent.setup();

    await screen.findByTestId("grandprix-detail-page");
    await user.click(await screen.findByTestId("gp-tab-picks"));

    expect(await screen.findByTestId("prediction-summary")).toBeInTheDocument();
    expect(await screen.findByTestId("view-results-cta")).toBeInTheDocument();
    expect(screen.queryByTestId("make-predictions-cta")).not.toBeInTheDocument();
  });
});
