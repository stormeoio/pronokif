/**
 * PredictionSummaryCard — component tests.
 *
 * Verifies the read-only recap shown on the Pronos tab renders the user's
 * submitted picks (pole, winner, top 10, bonus) resolved to driver names/codes.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import PredictionSummaryCard from "./PredictionSummaryCard";
import { renderWithProviders } from "@/test/utils";
import { api } from "@/lib/api";
import type { Driver, Prediction } from "@/types/api";

vi.mock("@/lib/api", () => ({
  api: { drivers: { list: vi.fn() } },
}));

const DRIVERS: Driver[] = [
  ["d1", "VER", "Verstappen"],
  ["d2", "NOR", "Norris"],
  ["d3", "LEC", "Leclerc"],
  ["d4", "RUS", "Russell"],
  ["d5", "PIA", "Piastri"],
  ["d6", "HAM", "Hamilton"],
  ["d7", "ANT", "Antonelli"],
  ["d8", "GAS", "Gasly"],
  ["d9", "SAI", "Sainz"],
  ["d10", "ALB", "Albon"],
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

const top10 = ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10"];

const prediction: Prediction = {
  id: "p1",
  user_id: "user-1",
  race_id: "race-1",
  quali_pole: "d1",
  quali_top10: top10,
  sprint_quali_top10: null,
  sprint_race_top10: null,
  race_winner: "d2",
  race_top10: ["d2", "d1", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10"],
  bonus_bets: {
    safety_car: true,
    dnf_drivers: ["d9", "d10"],
    fastest_lap_driver: "d3",
    first_corner_leader: "d1",
  },
  sprint_bonus_bets: null,
  custom_predictions: null,
  locked: false,
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  (api.drivers.list as ReturnType<typeof vi.fn>).mockResolvedValue(DRIVERS);
});

describe("PredictionSummaryCard", () => {
  it("renders the user's pole, winner, top 10 and bonus picks", async () => {
    renderWithProviders(<PredictionSummaryCard prediction={prediction} />);

    const card = await screen.findByTestId("prediction-summary");
    await waitFor(() => expect(within(card).getAllByText("Verstappen").length).toBeGreaterThan(0));

    // Qualifying pole + race winner headlines (resolved to last names)
    expect(within(card).getByText("Qualifications")).toBeInTheDocument();
    expect(within(card).getByText("Course")).toBeInTheDocument();
    expect(within(card).getAllByText("Verstappen").length).toBeGreaterThan(0); // pole = d1
    expect(within(card).getByText("Norris")).toBeInTheDocument(); // winner = d2

    // Top 10 rendered as position + driver code chips
    expect(within(card).getAllByText("NOR").length).toBeGreaterThan(0);

    // Bonus bets
    expect(within(card).getByText("Safety Car")).toBeInTheDocument();
    expect(within(card).getByText("Oui")).toBeInTheDocument();
    expect(within(card).getByText("Meilleur tour")).toBeInTheDocument();
    expect(within(card).getByText("Leclerc")).toBeInTheDocument(); // fastest lap = d3
    expect(within(card).getByText("SAI, ALB")).toBeInTheDocument(); // DNFs = d9, d10
  });

  it("shows a lock chip when predictions are closed", async () => {
    renderWithProviders(<PredictionSummaryCard prediction={prediction} locked />);
    const card = await screen.findByTestId("prediction-summary");
    expect(within(card).getByText("Verrouillés")).toBeInTheDocument();
  });

  it("renders sprint picks on a sprint weekend", async () => {
    const sprintPrediction: Prediction = {
      ...prediction,
      sprint_quali_top10: top10,
      sprint_race_top10: ["d3", "d2", "d1", "d4", "d5", "d6", "d7", "d8", "d9", "d10"],
    };
    renderWithProviders(<PredictionSummaryCard prediction={sprintPrediction} isSprintWeekend />);
    const card = await screen.findByTestId("prediction-summary");
    await waitFor(() => expect(within(card).getByText("Sprint · Qualifs")).toBeInTheDocument());
    expect(within(card).getByText("Sprint · Course")).toBeInTheDocument();
  });
});
