/**
 * Shared utilities for Championship sub-components.
 * Broadcast Premium: pk-gold/silver/bronze ranks, team-color mapping.
 */
import React from "react";
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

export function getTeamColor(constructorId: string | undefined): string {
  const id = constructorId?.toLowerCase().replace(/\s+/g, "_");
  return (id && teamColors[id as keyof typeof teamColors]) || "#5F6673";
}

// --- Rank helpers -----------------------------------------------------------
export function getRankStyle(position: string | number): string {
  const pos = parseInt(String(position));
  if (pos === 1) return "bg-pk-gold/[0.06] border-pk-gold/20";
  if (pos === 2) return "bg-pk-silver/[0.06] border-pk-silver/20";
  if (pos === 3) return "bg-pk-bronze/[0.06] border-pk-bronze/20";
  return "bg-white/[0.02] border-white/[0.08]";
}

export function getRankIcon(position: string | number): React.ReactNode {
  const pos = parseInt(String(position));
  if (pos === 1) return <Crown className="w-5 h-5 text-pk-gold" />;
  if (pos === 2) return <Medal className="w-5 h-5 text-pk-silver" />;
  if (pos === 3) return <Award className="w-5 h-5 text-pk-bronze" />;
  return <span className="font-data text-[0.5625rem] text-pk-titane w-5 text-center">{pos}</span>;
}

// --- Driver-ID mapping (Ergast → Pronokif internal) -------------------------
export const DRIVER_ID_MAP: Record<string, string> = {
  norris: "norris",
  piastri: "piastri",
  russell: "russell",
  leclerc: "leclerc",
  hamilton: "hamilton",
  verstappen: "verstappen",
  sainz: "sainz",
  albon: "albon",
  lawson: "lawson",
  alonso: "alonso",
  stroll: "stroll",
  ocon: "ocon",
  bearman: "bearman",
  gasly: "gasly",
  colapinto: "colapinto",
  hulkenberg: "hulkenberg",
  bortoleto: "bortoleto",
  perez: "perez",
  bottas: "bottas",
  antonelli: "antonelli",
  hadjar: "hadjar",
  lindblad: "lindblad",
  max_verstappen: "verstappen",
};

// --- Misc -------------------------------------------------------------------
export function formatLapTime(seconds: number | null | undefined): string {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : secs;
}

export function isRaceCompleteed(race: { date: string }): boolean {
  return new Date(race.date) < new Date();
}
