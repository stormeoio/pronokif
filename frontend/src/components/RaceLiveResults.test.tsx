/**
 * RaceLiveResults — post-race "Tes pronos" comparison tests.
 *
 * Verifies that once results land, the section surfaces the user's pole/winner
 * picks against the actual result with hit (✓) / miss (✗ + actual) treatment.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import RaceLiveResults from "./RaceLiveResults";
import { renderWithProviders } from "@/test/utils";
import { api } from "@/lib/api";
import type { Driver } from "@/types/api";

vi.mock("@/lib/api", () => ({
  api: {
    results: { get: vi.fn() },
    drivers: { list: vi.fn() },
    leagues: { my: vi.fn(), leaderboard: vi.fn() },
  },
}));

const DRIVERS: Driver[] = [
  ["d1", "VER", "Verstappen"],
  ["d2", "NOR", "Norris"],
  ["d3", "LEC", "Leclerc"],
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

beforeEach(() => {
  vi.clearAllMocks();
  (api.drivers.list as ReturnType<typeof vi.fn>).mockResolvedValue(DRIVERS);
  (api.leagues.my as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (api.results.get as ReturnType<typeof vi.fn>).mockResolvedValue({
    results: { quali_pole: "d1", race_winner: "d2", race_top10: ["d2", "d1", "d3"] },
    // Pole picked correctly (d1), winner picked wrong (d3 vs actual d2).
    prediction: { quali_pole: "d1", race_winner: "d3", race_top10: ["d3", "d2", "d1"] },
    points: { total: 21 },
  });
});

describe("RaceLiveResults — picks vs result", () => {
  it("marks a correct pole pick and an incorrect winner pick with the actual", async () => {
    renderWithProviders(<RaceLiveResults raceId="race-1" isLive={false} isFinished />);

    const picks = await screen.findByTestId("live-my-picks");
    expect(within(picks).getByText("Tes pronos")).toBeInTheDocument();

    // Pole pick = VER (correct → emerald + check)
    const polePick = within(picks).getByText("VER");
    expect(polePick.className).toContain("text-pk-emerald");

    // Winner pick = LEC (wrong → muted), actual winner shown as "→ NOR"
    const winnerPick = within(picks).getByText("LEC");
    expect(winnerPick.className).not.toContain("text-pk-emerald");
    expect(within(picks).getByText("→ NOR")).toBeInTheDocument();
  });

  it("still renders the podium and personal score", async () => {
    renderWithProviders(<RaceLiveResults raceId="race-1" isLive={false} isFinished />);

    const podium = await screen.findByTestId("live-podium");
    expect(within(podium).getByText("NOR")).toBeInTheDocument(); // race winner first

    await waitFor(() => expect(screen.getByTestId("live-my-score").textContent).toContain("+21"));
  });

  it("hides the picks block until results are available", async () => {
    (api.results.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: null,
      prediction: { quali_pole: "d1", race_winner: "d3" },
      points: null,
    });
    renderWithProviders(<RaceLiveResults raceId="race-1" isLive isFinished={false} />);

    // Section mounts (awaiting state) but no comparison without results.
    await screen.findByTestId("race-live-results");
    expect(screen.queryByTestId("live-my-picks")).not.toBeInTheDocument();
  });
});

describe("RaceLiveResults — correction banner", () => {
  it("shows the correction banner when the stored result was corrected", async () => {
    (api.results.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: { quali_pole: "d1", race_winner: "d2", race_top10: ["d2", "d1", "d3"] },
      prediction: { quali_pole: "d1", race_winner: "d2" },
      points: { total: 21 },
      corrected_at: "2026-06-12T10:00:00+00:00",
    });
    renderWithProviders(<RaceLiveResults raceId="race-1" isLive={false} isFinished />);

    expect(await screen.findByTestId("results-corrected-banner")).toBeInTheDocument();
  });

  it("hides the correction banner when the result was never corrected", async () => {
    // beforeEach mock returns no corrected_at.
    renderWithProviders(<RaceLiveResults raceId="race-1" isLive={false} isFinished />);

    await screen.findByTestId("race-live-results");
    expect(screen.queryByTestId("results-corrected-banner")).not.toBeInTheDocument();
  });
});
