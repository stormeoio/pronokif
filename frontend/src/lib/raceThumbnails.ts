const RACE_THUMBNAIL_BASE = "/images/races";

const RACE_THUMBNAILS_BY_ID = {
  "australia-2026": `${RACE_THUMBNAIL_BASE}/australia-2026.webp`,
  "china-2026": `${RACE_THUMBNAIL_BASE}/china-2026.webp`,
  "japan-2026": `${RACE_THUMBNAIL_BASE}/japan-2026.webp`,
  "bahrain-2026": `${RACE_THUMBNAIL_BASE}/bahrain-2026.webp`,
  "saudi-2026": `${RACE_THUMBNAIL_BASE}/saudi-2026.webp`,
  "miami-2026": `${RACE_THUMBNAIL_BASE}/miami-2026.webp`,
  "monaco-2026": `${RACE_THUMBNAIL_BASE}/monaco-2026.webp`,
  "spain-2026": `${RACE_THUMBNAIL_BASE}/spain-2026.webp`,
  "canada-2026": `${RACE_THUMBNAIL_BASE}/canada-2026.webp`,
  "austria-2026": `${RACE_THUMBNAIL_BASE}/austria-2026.webp`,
  "silverstone-2026": `${RACE_THUMBNAIL_BASE}/silverstone-2026.webp`,
  "belgium-2026": `${RACE_THUMBNAIL_BASE}/belgium-2026.webp`,
  "hungary-2026": `${RACE_THUMBNAIL_BASE}/hungary-2026.webp`,
  "netherlands-2026": `${RACE_THUMBNAIL_BASE}/netherlands-2026.webp`,
  "monza-2026": `${RACE_THUMBNAIL_BASE}/monza-2026.webp`,
  "madrid-2026": `${RACE_THUMBNAIL_BASE}/madrid-2026.webp`,
  "azerbaijan-2026": `${RACE_THUMBNAIL_BASE}/azerbaijan-2026.webp`,
  "singapore-2026": `${RACE_THUMBNAIL_BASE}/singapore-2026.webp`,
  "austin-2026": `${RACE_THUMBNAIL_BASE}/austin-2026.webp`,
  "mexico-2026": `${RACE_THUMBNAIL_BASE}/mexico-2026.webp`,
  "brazil-2026": `${RACE_THUMBNAIL_BASE}/brazil-2026.webp`,
  "vegas-2026": `${RACE_THUMBNAIL_BASE}/vegas-2026.webp`,
  "qatar-2026": `${RACE_THUMBNAIL_BASE}/qatar-2026.webp`,
  "abudhabi-2026": `${RACE_THUMBNAIL_BASE}/abudhabi-2026.webp`,
} as const;

const RACE_ID_BY_CIRCUIT: Record<string, keyof typeof RACE_THUMBNAILS_BY_ID> = {
  albert_park: "australia-2026",
  shanghai: "china-2026",
  suzuka: "japan-2026",
  bahrain: "bahrain-2026",
  sakhir: "bahrain-2026",
  jeddah: "saudi-2026",
  miami: "miami-2026",
  monaco: "monaco-2026",
  catalunya: "spain-2026",
  barcelona: "spain-2026",
  villeneuve: "canada-2026",
  montreal: "canada-2026",
  red_bull_ring: "austria-2026",
  spielberg: "austria-2026",
  silverstone: "silverstone-2026",
  spa: "belgium-2026",
  spa_francorchamps: "belgium-2026",
  hungaroring: "hungary-2026",
  zandvoort: "netherlands-2026",
  monza: "monza-2026",
  madrid: "madrid-2026",
  baku: "azerbaijan-2026",
  marina_bay: "singapore-2026",
  americas: "austin-2026",
  cota: "austin-2026",
  rodriguez: "mexico-2026",
  hermanos_rodriguez: "mexico-2026",
  interlagos: "brazil-2026",
  las_vegas: "vegas-2026",
  vegas: "vegas-2026",
  losail: "qatar-2026",
  lusail: "qatar-2026",
  yas_marina: "abudhabi-2026",
};

const RACE_ID_BY_NAME_KEYWORD: Array<[RegExp, keyof typeof RACE_THUMBNAILS_BY_ID]> = [
  [/austral|melbourne|albert park/, "australia-2026"],
  [/chin|shanghai/, "china-2026"],
  [/japan|japon|suzuka/, "japan-2026"],
  [/bahrain|bahrein|sakhir/, "bahrain-2026"],
  [/saudi|arabie|jeddah/, "saudi-2026"],
  [/miami/, "miami-2026"],
  [/monaco|monte.?carlo/, "monaco-2026"],
  [/spanish|espagne|barcelona|catalunya/, "spain-2026"],
  [/canad|montreal|gilles.?villeneuve/, "canada-2026"],
  [/austria|autriche|spielberg|red bull ring/, "austria-2026"],
  [/british|grande.?bretagne|silverstone/, "silverstone-2026"],
  [/belg|spa/, "belgium-2026"],
  [/hungar|hongr|budapest/, "hungary-2026"],
  [/dutch|netherlands|pays.?bas|zandvoort/, "netherlands-2026"],
  [/italian|monza/, "monza-2026"],
  [/madrid/, "madrid-2026"],
  [/azerbaijan|baku/, "azerbaijan-2026"],
  [/singapore|marina bay/, "singapore-2026"],
  [/united states|us grand prix|austin|cota|americas/, "austin-2026"],
  [/mexic|rodriguez/, "mexico-2026"],
  [/sao paulo|sao-paulo|são paulo|brazil|bresil|interlagos/, "brazil-2026"],
  [/las vegas|vegas/, "vegas-2026"],
  [/qatar|lusail|losail/, "qatar-2026"],
  [/abu dhabi|yas marina/, "abudhabi-2026"],
];

function normalizeKey(value?: string | number | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getRaceThumbnailById(id?: string | number | null): string | undefined {
  const key = normalizeKey(id).replace(/_/g, "-");
  return RACE_THUMBNAILS_BY_ID[key as keyof typeof RACE_THUMBNAILS_BY_ID];
}

export function getRaceThumbnailByCircuit(circuit?: string | null): string | undefined {
  const raceId = RACE_ID_BY_CIRCUIT[normalizeKey(circuit)];
  return raceId ? RACE_THUMBNAILS_BY_ID[raceId] : undefined;
}

export function getRaceThumbnailByName(name?: string | null): string | undefined {
  const normalizedName = normalizeKey(name).replace(/_/g, " ");
  const match = RACE_ID_BY_NAME_KEYWORD.find(([pattern]) => pattern.test(normalizedName));
  return match ? RACE_THUMBNAILS_BY_ID[match[1]] : undefined;
}

export function getRaceThumbnail(
  race?: {
    id?: string | number | null;
    name?: string | null;
    raceName?: string | null;
    circuit?: string | null;
    Circuit?: { circuitId?: string | null } | null;
    thumbnail_url?: string | null;
  } | null,
): string | undefined {
  if (!race) return undefined;
  return (
    race.thumbnail_url ||
    getRaceThumbnailById(race.id) ||
    getRaceThumbnailByCircuit(race.Circuit?.circuitId) ||
    getRaceThumbnailByCircuit(race.circuit) ||
    getRaceThumbnailByName(race.raceName || race.name)
  );
}
