/**
 * RaceGrid — Drivers grouped by constructor, with driver photos and team logos.
 *
 * Used in the Grand Prix detail "Grille" tab. Driver headshots come from the
 * F1 media CDN (via getDriverPhoto); team logos are bundled local SVGs
 * (see lib/teamLogos). Falls back gracefully when a photo is missing.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { getTeamMeta } from "@/lib/teamLogos";
import { resolveDriverPhoto } from "@/lib/driverPhotos";
import { fadeUp } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import { EmptyFullPage } from "@/components/EmptyState";
import type { Driver } from "@/types/api";

interface TeamGroup {
  meta: ReturnType<typeof getTeamMeta>;
  drivers: Driver[];
}

export default function RaceGrid() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.drivers.list(),
    queryFn: () => api.drivers.list(),
    staleTime: 5 * 60_000,
  });

  const groups = useMemo<TeamGroup[]>(() => {
    const drivers = data ?? [];
    const byKey = new Map<string, TeamGroup>();
    for (const d of drivers) {
      const meta = getTeamMeta(d.team);
      const existing = byKey.get(meta.key);
      if (existing) existing.drivers.push(d);
      else byKey.set(meta.key, { meta, drivers: [d] });
    }
    // Sort drivers within team by race number, teams by name.
    const list = [...byKey.values()];
    list.forEach((g) => g.drivers.sort((a, b) => (a.number ?? 99) - (b.number ?? 99)));
    list.sort((a, b) => a.meta.name.localeCompare(b.meta.name));
    return list;
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-white/[0.06] bg-pk-surface"
          />
        ))}
      </div>
    );
  }

  if (isError || groups.length === 0) {
    return (
      <EmptyFullPage
        Icon={Users}
        title="Grille indisponible"
        description="La liste des pilotes et écuries n'est pas encore disponible."
      />
    );
  }

  return (
    <div className="space-y-3 pb-2" data-testid="race-grid">
      {groups.map((group) => (
        <motion.div
          key={group.meta.key}
          variants={fadeUp}
          className="overflow-hidden rounded-lg border border-white/[0.08] bg-pk-surface"
          style={{ boxShadow: `inset 3px 0 0 0 ${group.meta.color}` }}
        >
          {/* Team header */}
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-2.5">
            {/* Team logo: prefer official CDN from first driver's team_logo_url, fall back to local SVG */}
            {(() => {
              const logoSrc =
                (group.drivers[0] as { team_logo_url?: string | null })?.team_logo_url ||
                group.meta.logo;
              return logoSrc ? (
                <img
                  src={logoSrc}
                  alt={group.meta.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 flex-shrink-0 rounded-md object-contain"
                  loading="lazy"
                  onError={(e) => {
                    // CDN 404 → fall back to local SVG
                    if (group.meta.logo)
                      (e.currentTarget as HTMLImageElement).src = group.meta.logo;
                  }}
                />
              ) : (
                <span
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md font-data text-[0.625rem] font-bold"
                  style={{ backgroundColor: `${group.meta.color}22`, color: group.meta.color }}
                >
                  {group.meta.abbr}
                </span>
              );
            })()}
            <h3 className="flex-1 truncate font-display text-[0.9375rem] uppercase tracking-wide text-pk-piste">
              {group.meta.name}
            </h3>
            <span className="font-data text-[0.5625rem] uppercase tracking-[0.1em] text-pk-titane">
              {group.drivers.length} pilote{group.drivers.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Drivers */}
          <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
            {group.drivers.map((driver) => {
              // Prefer photo_url from API (populated by admin seed), fall back to local dict
              const photo = resolveDriverPhoto(driver);
              const initials =
                (driver.first_name?.[0] ?? driver.name?.[0] ?? "") + (driver.last_name?.[0] ?? "");
              return (
                <button
                  key={driver.id}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    navigate(`/driver/${driver.id}`);
                  }}
                  className="flex items-center gap-2.5 bg-pk-surface px-3 py-2.5 text-left transition-colors duration-pk-short hover:bg-white/[0.03] active:scale-[0.99]"
                  data-testid={`grid-driver-${driver.id}`}
                >
                  {/* Photo / fallback */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="h-11 w-11 overflow-hidden rounded-full border-2"
                      style={{ borderColor: group.meta.color }}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={driver.name}
                          loading="lazy"
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div
                          className="flex h-full w-full items-center justify-center font-data text-sm font-bold text-white"
                          style={{ backgroundColor: `${group.meta.color}33` }}
                        >
                          {initials.toUpperCase() || driver.number}
                        </div>
                      )}
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1 font-data text-[0.5625rem] font-bold text-white shadow-md"
                      style={{ backgroundColor: group.meta.color }}
                    >
                      {driver.number}
                    </span>
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <p className="truncate font-body text-[0.6875rem] leading-none text-pk-titane">
                      {driver.first_name || driver.name?.split(" ")[0]}
                    </p>
                    <p className="mt-0.5 truncate font-display text-[0.8125rem] uppercase leading-tight text-pk-piste">
                      {driver.last_name || driver.name?.split(" ").slice(1).join(" ")}
                    </p>
                    {driver.code ? (
                      <p
                        className="mt-0.5 font-data text-[0.5rem] uppercase tracking-[0.12em]"
                        style={{ color: group.meta.color }}
                      >
                        {driver.code}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
