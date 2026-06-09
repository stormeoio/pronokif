import { EntityToken } from "@/components/entities/EntityToken";

function compactTeamName(name: string) {
  return name.replace(/\s+Formula 1 Team$/i, "").replace(/\s+F1 Team$/i, "");
}

function teamDetailHref(teamId: string | null | undefined): string | undefined {
  if (!teamId) return undefined;
  return `/team/${teamId}`;
}

export function TeamEntityToken({
  teamId,
  name,
  nationality,
  href,
  linked = true,
  focusable = true,
  className,
}: {
  teamId?: string | null;
  name?: string | null;
  nationality?: string | null;
  href?: string;
  linked?: boolean;
  focusable?: boolean;
  className?: string;
}) {
  if (!name) return <span className="text-pk-titane">Écurie inconnue</span>;

  return (
    <EntityToken
      compactLabel={compactTeamName(name)}
      label={name}
      kindLabel="Écurie"
      href={linked ? (href ?? teamDetailHref(teamId)) : undefined}
      description="Voir la fiche écurie."
      tone="team"
      className={className}
      focusable={focusable}
      meta={[
        { label: "ID", value: teamId },
        { label: "Nationalité", value: nationality },
      ]}
    />
  );
}
