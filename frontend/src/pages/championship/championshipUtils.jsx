/**
 * Shared utilities for Championship sub-components.
 *
 * Contains team-color mapping (keyed by Ergast constructorId slug),
 * rank styling helpers, and API base URLs.
 */
import { Crown, Medal, Award } from "lucide-react";

// --- API endpoints ----------------------------------------------------------
export const JOLPICA_API = "https://api.jolpi.ca/ergast/f1";
export const OPENF1_API = "https://api.openf1.org/v1";

// --- Team colors (keyed by Ergast constructorId) ----------------------------
const teamColors = {
  red_bull: "#3671C6",
  ferrari: "#E80020",
  mercedes: "#27F4D2",
  mclaren: "#FF8000",
  aston_martin: "#229971",
  alpine: "#0093CC",
  williams: "#64C4FF",
  rb: "#6692FF",
  kick_sauber: "#52E252",
  sauber: "#52E252",
  haas: "#B6BABD",
};

export function getTeamColor(constructorId) {
  const id = constructorId?.toLowerCase().replace(/\s+/g, "_");
  return teamColors[id] || "#666666";
}

// --- Rank helpers -----------------------------------------------------------
export function getRankStyle(position) {
  const pos = parseInt(position);
  if (pos === 1) return "bg-gradient-to-r from-yellow-500/30 to-yellow-600/10 border-yellow-500/50";
  if (pos === 2) return "bg-gradient-to-r from-gray-400/30 to-gray-500/10 border-gray-400/50";
  if (pos === 3) return "bg-gradient-to-r from-amber-600/30 to-amber-700/10 border-amber-600/50";
  return "bg-gray-800/30 border-gray-700/50";
}

export function getRankIcon(position) {
  const pos = parseInt(position);
  if (pos === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (pos === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (pos === 3) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="font-data text-gray-500 w-5 text-center">{pos}</span>;
}

// --- Driver-ID mapping (Ergast → Pronokif internal) -------------------------
export const DRIVER_ID_MAP = {
  norris: "norris", piastri: "piastri", russell: "russell",
  leclerc: "leclerc", hamilton: "hamilton", verstappen: "verstappen",
  sainz: "sainz", albon: "albon", lawson: "lawson",
  alonso: "alonso", stroll: "stroll", ocon: "ocon",
  bearman: "bearman", gasly: "gasly", colapinto: "colapinto",
  hulkenberg: "hulkenberg", bortoleto: "bortoleto", perez: "perez",
  bottas: "bottas", antonelli: "antonelli", hadjar: "hadjar",
  lindblad: "lindblad", max_verstappen: "verstappen",
};

// --- Misc -------------------------------------------------------------------
export function formatLapTime(seconds) {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : secs;
}

export function isRaceCompleted(race) {
  return new Date(race.date) < new Date();
}
