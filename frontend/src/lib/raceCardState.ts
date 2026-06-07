/**
 * Race card lifecycle — shared by the Courses grid (and unit-tested in
 * isolation). Keeps the pure state machine out of the component file so Fast
 * Refresh stays happy and the logic is testable without rendering.
 *
 *   needs-prediction / predicted   → predictions open, > 1h before close
 *   closing-soon                   → predictions open, ≤ 1h before close (live MM:SS)
 *   live                           → predictions closed, race running ("Suivre en Live")
 *   locked                         → predictions closed, race not started yet
 *   finished / cancelled           → terminal
 */
import type { Race } from "@/types/api";

export const HOUR_MS = 3_600_000;

export type CardState =
  | "needs-prediction"
  | "predicted"
  | "closing-soon"
  | "live"
  | "finished"
  | "cancelled"
  | "locked";

export function deriveState(
  race: Race,
  predicted: boolean,
  now: number,
): { state: CardState; msToClose: number } {
  if (race.status === "cancelled" || race.is_cancelled) return { state: "cancelled", msToClose: 0 };
  if (race.status === "finished") return { state: "finished", msToClose: 0 };

  const canPredict = race.can_predict ?? race.status === "upcoming";
  const closeAt = new Date(race.predictions_close_at).getTime();
  const msToClose = Number.isNaN(closeAt) ? Infinity : closeAt - now;
  const startAt = race.race_start_at ? new Date(race.race_start_at).getTime() : null;

  // Predictions still open
  if (canPredict && msToClose > 0) {
    if (msToClose <= HOUR_MS) return { state: "closing-soon", msToClose };
    return { state: predicted ? "predicted" : "needs-prediction", msToClose };
  }

  // Predictions closed — "live" until the backend marks the race finished
  const isLive = race.status === "in_progress" || (startAt != null && now >= startAt);
  return { state: isLive ? "live" : "locked", msToClose: 0 };
}

/** Remaining time as MM:SS (always < 1h when shown). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
