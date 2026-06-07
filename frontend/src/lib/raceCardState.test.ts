/**
 * Unit tests for the Courses grid card lifecycle:
 *   needs-prediction / predicted → closing-soon (≤1h) → live → finished.
 */
import { describe, it, expect } from "vitest";
import { deriveState, formatCountdown } from "./raceCardState";
import type { Race } from "@/types/api";

const NOW = 1_700_000_000_000; // fixed "now" for deterministic tests
const min = (n: number) => n * 60_000;

function makeRace(overrides: Partial<Race>): Race {
  return {
    id: "r1",
    name: "Grand Prix de Test",
    circuit: "Test",
    country: "Monaco",
    date: new Date(NOW + min(120)).toISOString(),
    quali_date: "",
    sprint_quali_date: null,
    sprint_race_date: null,
    predictions_close_at: new Date(NOW + min(120)).toISOString(),
    status: "upcoming",
    is_sprint_weekend: false,
    results: null,
    race_time: null,
    quali_time: null,
    sprint_quali_time: null,
    sprint_race_time: null,
    timezone: "Europe/Monaco",
    race_start_at: new Date(NOW + min(120)).toISOString(),
    race_end_at: null,
    race_duration_minutes: 120,
    can_predict: true,
    ...overrides,
  };
}

describe("deriveState", () => {
  it("predictions open >1h, not predicted → needs-prediction", () => {
    const race = makeRace({ predictions_close_at: new Date(NOW + min(90)).toISOString() });
    expect(deriveState(race, false, NOW).state).toBe("needs-prediction");
  });

  it("predictions open >1h, predicted → predicted", () => {
    const race = makeRace({ predictions_close_at: new Date(NOW + min(90)).toISOString() });
    expect(deriveState(race, true, NOW).state).toBe("predicted");
  });

  it("predictions open ≤1h → closing-soon with remaining ms", () => {
    const race = makeRace({ predictions_close_at: new Date(NOW + min(30)).toISOString() });
    const r = deriveState(race, false, NOW);
    expect(r.state).toBe("closing-soon");
    expect(r.msToClose).toBe(min(30));
  });

  it("closing-soon applies even when already predicted (still editable)", () => {
    const race = makeRace({ predictions_close_at: new Date(NOW + min(5)).toISOString() });
    expect(deriveState(race, true, NOW).state).toBe("closing-soon");
  });

  it("predictions closed + race started → live", () => {
    const race = makeRace({
      predictions_close_at: new Date(NOW - min(1)).toISOString(),
      race_start_at: new Date(NOW - min(1)).toISOString(),
    });
    expect(deriveState(race, true, NOW).state).toBe("live");
  });

  it("predictions closed + status in_progress → live", () => {
    const race = makeRace({
      status: "in_progress",
      can_predict: false,
      predictions_close_at: new Date(NOW - min(10)).toISOString(),
      race_start_at: null,
    });
    expect(deriveState(race, true, NOW).state).toBe("live");
  });

  it("predictions closed but race not started yet → locked", () => {
    const race = makeRace({
      can_predict: false,
      predictions_close_at: new Date(NOW - min(10)).toISOString(),
      race_start_at: new Date(NOW + min(60)).toISOString(),
    });
    expect(deriveState(race, false, NOW).state).toBe("locked");
  });

  it("finished → finished (terminal)", () => {
    const race = makeRace({ status: "finished" });
    expect(deriveState(race, true, NOW).state).toBe("finished");
  });

  it("cancelled → cancelled (terminal, even if flagged via is_cancelled)", () => {
    const race = makeRace({ status: "upcoming", is_cancelled: true });
    expect(deriveState(race, false, NOW).state).toBe("cancelled");
  });
});

describe("formatCountdown", () => {
  it("formats MM:SS zero-padded", () => {
    expect(formatCountdown(min(59) + 59_000)).toBe("59:59");
    expect(formatCountdown(min(5) + 3_000)).toBe("05:03");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("clamps negatives to 00:00", () => {
    expect(formatCountdown(-5000)).toBe("00:00");
  });
});
