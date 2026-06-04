/**
 * Team / constructor metadata — logo, color, abbreviation.
 *
 * Logos are bundled locally as house-style monogram SVGs under
 * /public/images/teams/<key>.svg (they are NOT official manufacturer marks).
 * Colors mirror the Ergast-keyed map in championshipUtils for consistency.
 */

export interface TeamMeta {
  key: string;
  name: string;
  abbr: string;
  color: string;
  logo: string;
}

const TEAMS: Record<string, TeamMeta> = {
  mclaren: {
    key: "mclaren",
    name: "McLaren",
    abbr: "MCL",
    color: "#FF8000",
    logo: "/images/teams/mclaren.svg",
  },
  mercedes: {
    key: "mercedes",
    name: "Mercedes",
    abbr: "MER",
    color: "#27F4D2",
    logo: "/images/teams/mercedes.svg",
  },
  ferrari: {
    key: "ferrari",
    name: "Ferrari",
    abbr: "FER",
    color: "#E80020",
    logo: "/images/teams/ferrari.svg",
  },
  "red-bull": {
    key: "red-bull",
    name: "Red Bull Racing",
    abbr: "RBR",
    color: "#3671C6",
    logo: "/images/teams/red-bull.svg",
  },
  williams: {
    key: "williams",
    name: "Williams",
    abbr: "WIL",
    color: "#64C4FF",
    logo: "/images/teams/williams.svg",
  },
  "racing-bulls": {
    key: "racing-bulls",
    name: "Racing Bulls",
    abbr: "RB",
    color: "#6692FF",
    logo: "/images/teams/racing-bulls.svg",
  },
  "aston-martin": {
    key: "aston-martin",
    name: "Aston Martin",
    abbr: "AMR",
    color: "#229971",
    logo: "/images/teams/aston-martin.svg",
  },
  haas: {
    key: "haas",
    name: "Haas",
    abbr: "HAA",
    color: "#B6BABD",
    logo: "/images/teams/haas.svg",
  },
  alpine: {
    key: "alpine",
    name: "Alpine",
    abbr: "ALP",
    color: "#0093CC",
    logo: "/images/teams/alpine.svg",
  },
  audi: {
    key: "audi",
    name: "Audi",
    abbr: "AUD",
    color: "#00B0A0",
    logo: "/images/teams/audi.svg",
  },
  cadillac: {
    key: "cadillac",
    name: "Cadillac",
    abbr: "CAD",
    color: "#D4AF37",
    logo: "/images/teams/cadillac.svg",
  },
};

/** Aliases → canonical key (handles API team-name variations). */
const ALIASES: Record<string, string> = {
  mclaren: "mclaren",
  "mclaren f1 team": "mclaren",
  mercedes: "mercedes",
  "mercedes amg": "mercedes",
  "mercedes-amg petronas": "mercedes",
  ferrari: "ferrari",
  "scuderia ferrari": "ferrari",
  "red bull": "red-bull",
  "red bull racing": "red-bull",
  redbull: "red-bull",
  williams: "williams",
  "williams racing": "williams",
  "racing bulls": "racing-bulls",
  "visa cash app rb": "racing-bulls",
  rb: "racing-bulls",
  alphatauri: "racing-bulls",
  "aston martin": "aston-martin",
  "aston martin aramco": "aston-martin",
  haas: "haas",
  "haas f1 team": "haas",
  "moneygram haas": "haas",
  alpine: "alpine",
  "bwt alpine": "alpine",
  audi: "audi",
  sauber: "audi",
  "kick sauber": "audi",
  "stake f1 team": "audi",
  cadillac: "cadillac",
  "cadillac f1 team": "cadillac",
};

const FALLBACK: TeamMeta = {
  key: "unknown",
  name: "Écurie",
  abbr: "F1",
  color: "#5F6673",
  logo: "",
};

/** Normalize a team display name / id to a canonical key. */
export function teamKeyFor(team: string | undefined | null): string | null {
  if (!team) return null;
  const norm = team.toLowerCase().trim().replace(/\s+/g, " ");
  if (TEAMS[norm.replace(/\s+/g, "-")]) return norm.replace(/\s+/g, "-");
  return ALIASES[norm] ?? null;
}

/** Resolve full team metadata from any team name/id. */
export function getTeamMeta(team: string | undefined | null): TeamMeta {
  const key = teamKeyFor(team);
  if (key && TEAMS[key]) return TEAMS[key];
  // Unknown team: keep its display name, neutral styling.
  return { ...FALLBACK, name: team || FALLBACK.name };
}
