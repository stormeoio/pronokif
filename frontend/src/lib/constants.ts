/**
 * Shared constants used across the Pronokif frontend.
 *
 * Centralised here so pages don't duplicate mappings (AdminPage and
 * PredictionsPage both had their own TEAM_COLORS copy before S3).
 */

export const TEAM_COLORS: Record<string, string> = {
  "Red Bull Racing": "#3671C6",
  Ferrari: "#F91536",
  McLaren: "#FF8000",
  Mercedes: "#27F4D2",
  "Aston Martin": "#229971",
  Alpine: "#0093CC",
  Williams: "#64C4FF",
  RB: "#6692FF",
  Sauber: "#52E252",
  Haas: "#B6BABD",
};
