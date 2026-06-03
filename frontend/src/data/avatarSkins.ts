/**
 * Avatar Generator skin catalog.
 * Each skin is a PNG mask with a transparent visor area.
 * The user's face photo is composited behind the mask.
 */

export interface AvatarSkin {
  id: string;
  team: string;
  /** Filename without extension (lowercase) */
  file: string;
  /** Team primary color for UI accents */
  color: string;
}

export interface AvatarTeam {
  id: string;
  name: string;
  color: string;
  skins: AvatarSkin[];
}

const BASE = "/avatars/generators";

export function skinThumbUrl(file: string): string {
  return `${BASE}/thumb/${file}.png`;
}

export function skinFullUrl(file: string): string {
  return `${BASE}/full/${file}.png`;
}

export const AVATAR_TEAMS: AvatarTeam[] = [
  {
    id: "ferrari",
    name: "Ferrari",
    color: "#E8002D",
    skins: [
      { id: "ferrari1", team: "Ferrari", file: "ferrari1", color: "#E8002D" },
      { id: "ferrari3", team: "Ferrari", file: "ferrari3", color: "#E8002D" },
    ],
  },
  {
    id: "redbull",
    name: "Red Bull",
    color: "#3671C6",
    skins: [
      { id: "redbull2", team: "Red Bull", file: "redbull2", color: "#3671C6" },
      { id: "redbull3", team: "Red Bull", file: "redbull3", color: "#3671C6" },
    ],
  },
  {
    id: "mclaren",
    name: "McLaren",
    color: "#FF8000",
    skins: [
      { id: "mclaren1", team: "McLaren", file: "mclaren1", color: "#FF8000" },
      { id: "mclaren2", team: "McLaren", file: "mclaren2", color: "#FF8000" },
    ],
  },
  {
    id: "mercedes",
    name: "Mercedes",
    color: "#27F4D2",
    skins: [
      { id: "mercedes1", team: "Mercedes", file: "mercedes1", color: "#27F4D2" },
      { id: "mercedes2", team: "Mercedes", file: "mercedes2", color: "#27F4D2" },
    ],
  },
  {
    id: "alpine",
    name: "Alpine",
    color: "#FF87BC",
    skins: [
      { id: "alpine1", team: "Alpine", file: "alpine1", color: "#FF87BC" },
      { id: "alpine3", team: "Alpine", file: "alpine3", color: "#FF87BC" },
    ],
  },
  {
    id: "astonmartin",
    name: "Aston Martin",
    color: "#229971",
    skins: [
      { id: "astonmartin3", team: "Aston Martin", file: "astonmartin3", color: "#229971" },
      { id: "astonmartin4", team: "Aston Martin", file: "astonmartin4", color: "#229971" },
    ],
  },
  {
    id: "rbracing",
    name: "RB Racing",
    color: "#6692FF",
    skins: [
      { id: "rbracing1", team: "RB Racing", file: "rbracing1", color: "#6692FF" },
      { id: "rbracing2", team: "RB Racing", file: "rbracing2", color: "#6692FF" },
    ],
  },
  {
    id: "haas",
    name: "Haas",
    color: "#B6BABD",
    skins: [
      { id: "haas1", team: "Haas", file: "haas1", color: "#B6BABD" },
      { id: "haas2", team: "Haas", file: "haas2", color: "#B6BABD" },
    ],
  },
  {
    id: "williams",
    name: "Williams",
    color: "#64C4FF",
    skins: [
      { id: "williams1", team: "Williams", file: "wiliams1", color: "#64C4FF" },
      { id: "williams2", team: "Williams", file: "wiliams2", color: "#64C4FF" },
    ],
  },
  {
    id: "audi",
    name: "Audi",
    color: "#990000",
    skins: [{ id: "audi1", team: "Audi", file: "audi", color: "#990000" }],
  },
];

export const ALL_SKINS: AvatarSkin[] = AVATAR_TEAMS.flatMap((t) => t.skins);
