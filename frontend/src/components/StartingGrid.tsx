/**
 * StartingGrid — qualifying order (P1→P20) for a Grand Prix.
 *
 * Three states:
 *  • Locked   — qualifying session hasn't started yet → greyed skeleton rows
 *  • Awaiting — qualifying started but results not entered → spinner message
 *  • Live     — grid data is available → full P1→P20 driver list
 *
 * The component polls every 30 s once qualifying is underway so the grid
 * appears automatically as soon as an admin enters it.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Clock, LayoutGrid } from "lucide-react";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { getTeamMeta } from "@/lib/teamLogos";
import { resolveDriverPhoto } from "@/lib/driverPhotos";
import { fadeUp } from "@/lib/motion";
import { haptic } from "@/lib/haptics";
import type { Driver } from "@/types/api";

/* ── Local helpers ─────────────────────────────────────────── */

interface ParsedSession {
  short_name: string;
  datetime: string;
}

function formatQualiDateTime(isoString: string) {
  return new Date(isoString).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Props ─────────────────────────────────────────────────── */

interface StartingGridProps {
  raceId: string;
  sessions: ParsedSession[];
}

/* ── Component ─────────────────────────────────────────────── */

export default function StartingGrid({ raceId, sessions }: StartingGridProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Derive whether qualifying has started (session datetime < now).
  // We unlock the section as soon as the session was supposed to begin —
  // the admin enters results shortly after, and we poll until they appear.
  const qualiSession = sessions.find((s) => s.short_name === "QUALI");
  const isQualiStarted = qualiSession
    ? new Date(qualiSession.datetime).getTime() < Date.now()
    : false;

  /* ── Qualifying grid fetch ── */
  const { data: gridData, isLoading: gridLoading } = useQuery({
    queryKey: ["qualifying-grid", raceId],
    queryFn: async () => {
      try {
        return await api.races.qualifyingGrid(raceId);
      } catch {
        return null; // 404 → grid not entered yet
      }
    },
    enabled: !!raceId && isQualiStarted,
    staleTime: 60_000,
    // Poll every 30 s while quali is underway and the grid isn't in yet
    refetchInterval: isQualiStarted ? 30_000 : false,
  });

  /* ── Drivers list (only needed when we have grid data) ── */
  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: queryKeys.drivers.list(),
    queryFn: () => api.drivers.list(),
    staleTime: 5 * 60_000,
    enabled: !!gridData?.driver_order?.length,
  });

  /* ── Build ordered grid ── */
  const grid = useMemo<(Driver | null)[]>(() => {
    if (!gridData?.driver_order?.length) return [];
    return gridData.driver_order.map((id) => drivers.find((d) => d.id === id) ?? null);
  }, [gridData, drivers]);

  /* ════════ LOCKED STATE ════════ */
  if (!isQualiStarted) {
    return (
      <div className="space-y-3 pb-2" data-testid="starting-grid-locked">
        {/* Lock banner */}
        <div className="flex items-center gap-2.5 p-3.5 bg-pk-surface border border-white/[0.08] rounded-lg">
          <div className="w-8 h-8 rounded-md bg-pk-anthracite flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-pk-titane" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[0.8125rem] text-pk-piste">
              {t("grand_prix.grid.quali_not_started_title")}
            </p>
            {qualiSession && (
              <p className="mt-0.5 font-data text-[0.5625rem] uppercase tracking-[0.08em] text-pk-titane">
                {t("grand_prix.sessions.qualifying")} — {formatQualiDateTime(qualiSession.datetime)}
              </p>
            )}
          </div>
        </div>

        {/* Placeholder skeleton rows P1–P10, visually greyed */}
        <div className="space-y-1.5 opacity-25 pointer-events-none select-none" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-white/[0.05] bg-pk-surface"
            >
              <div className="w-8 h-8 rounded-md bg-pk-anthracite" />
              <div className="h-10 w-10 rounded-full bg-pk-anthracite" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-16 rounded bg-pk-anthracite" />
                <div className="h-3 w-24 rounded bg-pk-anthracite" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ════════ LOADING ════════ */
  if (gridLoading) {
    return (
      <div className="space-y-1.5 pb-2" data-testid="starting-grid-loading">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="h-[3.25rem] animate-pulse rounded-lg border border-white/[0.06] bg-pk-surface"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    );
  }

  /* ════════ AWAITING STATE ════════ */
  if (!gridData?.driver_order?.length) {
    return (
      <div
        className="flex flex-col items-center py-14 text-center"
        data-testid="starting-grid-awaiting"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="w-12 h-12 rounded-full bg-pk-anthracite flex items-center justify-center mb-3"
        >
          <Clock className="w-5 h-5 text-purple-400" />
        </motion.div>
        <p className="font-display text-[0.875rem] text-pk-titane mb-1">
          {t("grand_prix.grid.quali_awaiting_title")}
        </p>
        <p className="text-[0.75rem] text-pk-titane/60 max-w-[240px] leading-relaxed">
          {t("grand_prix.grid.quali_awaiting_desc")}
        </p>
      </div>
    );
  }

  /* ════════ GRID STATE ════════ */
  return (
    <div className="space-y-1.5 pb-2" data-testid="starting-grid">
      {/* Section header */}
      <div className="flex items-center gap-2 px-0.5 mb-2">
        <LayoutGrid className="w-3.5 h-3.5 text-purple-400" strokeWidth={1.5} />
        <span className="font-data text-[0.5625rem] uppercase tracking-[0.1em] text-pk-titane">
          {t("grand_prix.grid.starting_grid_title")}
        </span>
      </div>

      {grid.map((driver, idx) => {
        const pos = idx + 1;
        const isPole = pos === 1;

        if (!driver) {
          // Driver ID not matched — show a placeholder row
          return (
            <div
              key={idx}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-white/[0.06] bg-pk-surface"
            >
              <div className="w-8 h-8 rounded-md bg-pk-anthracite flex items-center justify-center">
                <span className="font-data text-[0.6875rem] font-bold text-pk-titane">P{pos}</span>
              </div>
              <div className="h-10 w-10 rounded-full bg-pk-anthracite/60 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-20 rounded bg-pk-anthracite/60 animate-pulse" />
                <div className="h-3 w-28 rounded bg-pk-anthracite/40 animate-pulse" />
              </div>
            </div>
          );
        }

        const teamMeta = getTeamMeta(driver.team);
        const photo = resolveDriverPhoto(driver);
        const initials =
          (driver.first_name?.[0] ?? driver.name?.[0] ?? "").toUpperCase() +
          (driver.last_name?.[0] ?? "").toUpperCase();

        return (
          <motion.button
            key={driver.id}
            type="button"
            variants={fadeUp}
            onClick={() => {
              haptic("light");
              navigate(`/driver/${driver.id}`);
            }}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors duration-pk-short active:scale-[0.99] ${
              isPole
                ? "bg-pk-surface border-purple-500/30 shadow-[inset_3px_0_0_0_theme(colors.purple.500)]"
                : "bg-pk-surface border-white/[0.06] hover:border-white/[0.10]"
            }`}
            style={isPole ? undefined : { boxShadow: `inset 3px 0 0 0 ${teamMeta.color}` }}
            data-testid={`grid-pos-${pos}`}
          >
            {/* Position badge */}
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                isPole ? "bg-purple-500/15" : "bg-pk-anthracite"
              }`}
            >
              <span
                className={`font-data text-[0.6875rem] font-bold ${
                  isPole ? "text-purple-400" : pos <= 10 ? "text-pk-piste" : "text-pk-titane"
                }`}
              >
                P{pos}
              </span>
            </div>

            {/* Driver photo */}
            <div
              className="h-10 w-10 overflow-hidden rounded-full border-2 flex-shrink-0"
              style={{ borderColor: teamMeta.color }}
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
                  className="flex h-full w-full items-center justify-center font-data text-xs font-bold text-white"
                  style={{ backgroundColor: `${teamMeta.color}33` }}
                >
                  {initials || driver.number}
                </div>
              )}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-body text-[0.625rem] leading-none text-pk-titane">
                {driver.first_name || driver.name?.split(" ")[0]}
              </p>
              <p className="mt-0.5 font-display text-[0.8125rem] uppercase leading-tight text-pk-piste truncate">
                {driver.last_name || driver.name?.split(" ").slice(1).join(" ")}
              </p>
              {isPole && (
                <p className="mt-0.5 font-data text-[0.4375rem] uppercase tracking-[0.1em] text-purple-400">
                  {t("grand_prix.grid.pole_position")}
                </p>
              )}
            </div>

            {/* Number badge + team abbr */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span
                className="min-w-[1.5rem] h-5 px-1 rounded flex items-center justify-center font-data text-[0.5rem] font-bold text-white"
                style={{ backgroundColor: teamMeta.color }}
              >
                {driver.number}
              </span>
              <span
                className="font-data text-[0.4375rem] uppercase tracking-[0.06em]"
                style={{ color: `${teamMeta.color}99` }}
              >
                {teamMeta.abbr}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
