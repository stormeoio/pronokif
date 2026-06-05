/**
 * Team / constructor metadata — logo, color, abbreviation.
 *
 * `logo`     — bundled local house-style monogram SVG (always available).
 * `logo_url` — official F1 CDN logo (Cloudinary for established teams,
 *              2026 path for newer entrants). May be undefined on unknown teams.
 *              Use with <img onError fallback to `logo`> for resilience.
 */

// Official F1 media CDN base paths (mirrors backend data/f1_data.py _TL_*)
// HD: q_auto + w_640,h_640 (up from q_75 w_160,h_160)
const _TL_BASE =
  "https://media.formula1.com/image/upload/f_auto,c_limit,q_auto,w_640,h_640/content/dam/fom-website/2018-redesign-assets/team%20logos";
const _TL_2026 =
  "https://media.formula1.com/d_default_fallback_image.png/content/dam/fom-website/teams/2026";

export interface TeamMeta {
  key: string;
  name: string;
  abbr: string;
  color: string;
  /** Local bundled SVG monogram — always resolves. */
  logo: string;
  /** Official F1 CDN logo — may 404 for newer/rebranded teams; use with onError fallback. */
  logo_url?: string;
}

const TEAMS: Record<string, TeamMeta> = {
  mclaren: {
    key: "mclaren",
    name: "McLaren",
    abbr: "MCL",
    color: "#FF8000",
    logo: "/images/teams/mclaren.svg",
    logo_url: `${_TL_BASE}/mclaren`,
  },
  mercedes: {
    key: "mercedes",
    name: "Mercedes",
    abbr: "MER",
    color: "#27F4D2",
    logo: "/images/teams/mercedes.svg",
    logo_url: `${_TL_BASE}/mercedes`,
  },
  ferrari: {
    key: "ferrari",
    name: "Ferrari",
    abbr: "FER",
    color: "#E80020",
    logo: "/images/teams/ferrari.svg",
    logo_url: `${_TL_BASE}/ferrari`,
  },
  "red-bull": {
    key: "red-bull",
    name: "Red Bull Racing",
    abbr: "RBR",
    color: "#3671C6",
    logo: "/images/teams/red-bull.svg",
    logo_url: `${_TL_BASE}/red%20bull%20racing`,
  },
  williams: {
    key: "williams",
    name: "Williams",
    abbr: "WIL",
    color: "#64C4FF",
    logo: "/images/teams/williams.svg",
    logo_url: `${_TL_BASE}/williams`,
  },
  "racing-bulls": {
    key: "racing-bulls",
    name: "Racing Bulls",
    abbr: "RB",
    color: "#6692FF",
    logo: "/images/teams/racing-bulls.svg",
    logo_url: `${_TL_BASE}/racing%20bulls`,
  },
  "aston-martin": {
    key: "aston-martin",
    name: "Aston Martin",
    abbr: "AMR",
    color: "#229971",
    logo: "/images/teams/aston-martin.svg",
    logo_url: `${_TL_BASE}/aston%20martin`,
  },
  haas: {
    key: "haas",
    name: "Haas",
    abbr: "HAA",
    color: "#B6BABD",
    logo: "/images/teams/haas.svg",
    logo_url: `${_TL_BASE}/haas`,
  },
  alpine: {
    key: "alpine",
    name: "Alpine",
    abbr: "ALP",
    color: "#0093CC",
    logo: "/images/teams/alpine.svg",
    logo_url: `${_TL_BASE}/alpine`,
  },
  audi: {
    key: "audi",
    name: "Audi",
    abbr: "AUD",
    color: "#00B0A0",
    logo: "/images/teams/audi.svg",
    logo_url: `${_TL_2026}/kick-sauber.png.transform/2col-retina/image.png`,
  },
  cadillac: {
    key: "cadillac",
    name: "Cadillac",
    abbr: "CAD",
    color: "#D4AF37",
    logo: "/images/teams/cadillac.svg",
    logo_url: `${_TL_2026}/cadillac.png.transform/2col-retina/image.png`,
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
