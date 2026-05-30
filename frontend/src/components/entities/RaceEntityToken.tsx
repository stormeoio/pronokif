import { EntityToken } from "@/components/entities/EntityToken";

type RaceEntity = {
  id?: string | null;
  race_id?: string | null;
  name?: string | null;
  race_name?: string | null;
  circuit?: string | null;
  country?: string | null;
  date?: string | null;
  season?: number | string | null;
  status?: string | null;
  round_number?: number | null;
};

function adminKnowledgeHref(entityType: "race" | "circuit" | "location", query: string) {
  const params = new URLSearchParams({
    tab: "knowledge",
    entity_type: entityType,
    q: query,
  });
  return `/admin?${params.toString()}`;
}

function raceIdFor(race?: RaceEntity | null, raceId?: string | null) {
  return raceId || race?.id || race?.race_id || null;
}

function raceNameFor(race?: RaceEntity | null, raceName?: string | null, fallback = "Course") {
  return raceName || race?.name || race?.race_name || raceIdFor(race) || fallback;
}

function shortRaceName(label: string) {
  return label
    .replace(/^Formula 1\s+/i, "")
    .replace(/\s+Grand Prix$/i, " GP")
    .replace(/^Grand Prix\s+/i, "GP ");
}

function formatDate(value?: string | null, mode: "short" | "long" = "short") {
  if (!value) return null;
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: mode === "short" ? "short" : "long",
    year: mode === "long" ? "numeric" : undefined,
  });
}

export function RaceEntityToken({
  race,
  raceId,
  raceName,
  href,
  linked = true,
  focusable = true,
  compactLabel,
  className,
}: {
  race?: RaceEntity | null;
  raceId?: string | null;
  raceName?: string | null;
  href?: string;
  linked?: boolean;
  focusable?: boolean;
  compactLabel?: string;
  className?: string;
}) {
  const id = raceIdFor(race, raceId);
  const label = raceNameFor(race, raceName);
  const displayLabel = compactLabel || shortRaceName(label);
  const resolvedHref = linked ? (href ?? (id ? `/race/${id}` : undefined)) : undefined;

  return (
    <EntityToken
      compactLabel={displayLabel}
      label={label}
      kindLabel="Course"
      href={resolvedHref}
      description={id ? "Ouvrir la fiche course." : undefined}
      tone="race"
      className={className}
      focusable={focusable}
      meta={[
        {
          label: "Circuit",
          value: race?.circuit,
          href: race?.circuit ? adminKnowledgeHref("circuit", race.circuit) : undefined,
          ariaLabel: race?.circuit ? `Ouvrir l'entité circuit ${race.circuit}` : undefined,
        },
        {
          label: "Pays",
          value: race?.country,
          href: race?.country ? adminKnowledgeHref("location", race.country) : undefined,
          ariaLabel: race?.country ? `Ouvrir l'entité lieu ${race.country}` : undefined,
        },
        { label: "Date", value: formatDate(race?.date, "long") },
        { label: "Saison", value: race?.season },
        { label: "Statut", value: race?.status },
      ]}
    />
  );
}

export function CircuitEntityToken({
  circuit,
  country,
  href,
  className,
}: {
  circuit?: string | null;
  country?: string | null;
  href?: string;
  className?: string;
}) {
  if (!circuit) return <span className="text-pk-titane">—</span>;

  return (
    <EntityToken
      compactLabel={circuit}
      label={circuit}
      kindLabel="Circuit"
      href={href ?? adminKnowledgeHref("circuit", circuit)}
      description="Ouvrir le contexte circuit."
      tone="circuit"
      className={className}
      meta={[
        {
          label: "Pays",
          value: country,
          href: country ? adminKnowledgeHref("location", country) : undefined,
          ariaLabel: country ? `Ouvrir l'entité lieu ${country}` : undefined,
        },
      ]}
    />
  );
}

export function DateEntityToken({
  value,
  href,
  focusable = true,
  className,
}: {
  value?: string | null;
  href?: string;
  focusable?: boolean;
  className?: string;
}) {
  const shortLabel = formatDate(value, "short");
  const longLabel = formatDate(value, "long");
  if (!shortLabel || !longLabel) return <span className="text-pk-titane">—</span>;
  const year = new Date(value!.includes("T") ? value! : `${value!}T12:00:00`).getFullYear();

  return (
    <EntityToken
      compactLabel={shortLabel}
      label={longLabel}
      kindLabel="Date"
      href={href}
      tone="date"
      className={className}
      focusable={focusable}
      meta={[{ label: "Année", value: Number.isNaN(year) ? null : year }]}
    />
  );
}
