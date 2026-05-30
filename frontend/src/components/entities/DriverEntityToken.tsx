import { Fragment } from "react";
import { EntityToken } from "@/components/entities/EntityToken";
import {
  driverCodeFromReference,
  resolveDriverReference,
  type DriverLookup,
} from "@/components/entities/driverEntityUtils";

function adminKnowledgeHref(entityType: "driver" | "team", query: string) {
  const params = new URLSearchParams({
    tab: "knowledge",
    entity_type: entityType,
    q: query,
  });
  return `/admin?${params.toString()}`;
}

export function DriverEntityToken({
  value,
  driversByReference,
  emptyLabel = "—",
  className,
}: {
  value?: string | number | null;
  driversByReference: DriverLookup;
  emptyLabel?: string;
  className?: string;
}) {
  if (!value) return <span className="text-white">{emptyLabel}</span>;

  const driver = resolveDriverReference(value, driversByReference);
  const compactLabel = driver?.code || driverCodeFromReference(value).toUpperCase();
  const label = driver?.name || String(value);

  return (
    <EntityToken
      compactLabel={compactLabel}
      label={label}
      kindLabel="Pilote"
      href={driver ? `/driver/${driver.id}` : undefined}
      description={driver ? "Ouvrir la fiche pilote." : undefined}
      tone="driver"
      className={className}
      meta={[
        {
          label: "Écurie",
          value: driver?.team,
          href: driver?.team ? adminKnowledgeHref("team", driver.team) : undefined,
          ariaLabel: driver?.team ? `Ouvrir l'entité écurie ${driver.team}` : undefined,
        },
        { label: "N°", value: driver?.number ? `#${driver.number}` : null },
        { label: "Pays", value: driver?.country },
      ]}
    />
  );
}

export function DriverEntityList({
  values,
  driversByReference,
  emptyLabel = "Non renseigné",
  limit = 3,
}: {
  values?: Array<string | number>;
  driversByReference: DriverLookup;
  emptyLabel?: string;
  limit?: number;
}) {
  const displayedValues = (values || []).slice(0, limit);
  if (!displayedValues.length) return <span className="text-white">{emptyLabel}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {displayedValues.map((value, index) => (
        <Fragment key={`${value}-${index}`}>
          {index > 0 ? <span className="font-data text-[0.625rem] text-pk-titane">/</span> : null}
          <DriverEntityToken value={value} driversByReference={driversByReference} />
        </Fragment>
      ))}
    </span>
  );
}
