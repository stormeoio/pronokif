/**
 * Courses — full-season race grid (2 columns on mobile).
 *
 * Each card shows the race vignette + prediction status. Tapping the card opens
 * the race detail (programme / fiche course); a dedicated footer action lets the
 * user pronosticate / modify directly, or see results for finished races.
 * Broadcast Premium theme.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RotateCw,
  Calendar,
  Check,
  Lock,
  Target,
  Pencil,
  Trophy,
  Ban,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { getRaceThumbnail } from "@/lib/raceThumbnails";
import { EmptyFullPage } from "@/components/EmptyState";
import type { Race } from "@/types/api";

/* ── Country flags ─────────────────────────────────────── */

const COUNTRY_FLAGS: Record<string, string> = {
  Australia: "🇦🇺",
  China: "🇨🇳",
  Japan: "🇯🇵",
  Bahrain: "🇧🇭",
  "Saudi Arabia": "🇸🇦",
  USA: "🇺🇸",
  "United States": "🇺🇸",
  Italy: "🇮🇹",
  Monaco: "🇲🇨",
  Spain: "🇪🇸",
  Canada: "🇨🇦",
  Austria: "🇦🇹",
  UK: "🇬🇧",
  "United Kingdom": "🇬🇧",
  "Great Britain": "🇬🇧",
  Belgium: "🇧🇪",
  Hungary: "🇭🇺",
  Netherlands: "🇳🇱",
  Azerbaijan: "🇦🇿",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Brazil: "🇧🇷",
  Qatar: "🇶🇦",
  UAE: "🇦🇪",
  "United Arab Emirates": "🇦🇪",
};

type FilterKey = "upcoming" | "completed" | "all";

function useFilters() {
  const { t } = useTranslation();
  return [
    { key: "upcoming" as FilterKey, label: t("race_calendar.filters.upcoming") },
    { key: "completed" as FilterKey, label: t("race_calendar.filters.finished") },
    { key: "all" as FilterKey, label: t("race_calendar.filters.all") },
  ];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function shortName(name: string) {
  return name
    .replace("Grand Prix de ", "")
    .replace("Grand Prix du ", "")
    .replace("Grand Prix d'", "")
    .replace(" Grand Prix", "")
    .replace("Grand Prix ", "");
}

type CardState = "needs-prediction" | "predicted" | "finished" | "cancelled" | "locked";

function deriveState(race: Race, predicted: boolean): CardState {
  const canPredict =
    (race as Race & { can_predict?: boolean }).can_predict ?? race.status === "upcoming";
  if (race.status === "cancelled" || race.is_cancelled) return "cancelled";
  if (race.status === "finished") return "finished";
  if (predicted) return "predicted";
  if (!canPredict) return "locked";
  return "needs-prediction";
}

/* ── Loading skeleton ──────────────────────────────────── */

function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 p-4 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="mb-2 h-5 w-40 animate-shimmer rounded bg-pk-anthracite" />
        <div className="mb-3 h-3 w-56 animate-shimmer rounded bg-pk-anthracite" />
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 flex-1 animate-shimmer rounded-full bg-pk-anthracite" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-24 pt-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-48 animate-shimmer rounded-lg border border-white/[0.08] bg-pk-surface"
          />
        ))}
      </div>
    </div>
  );
}

/* ── Race card ─────────────────────────────────────────── */

function RaceGridCard({ race, predicted }: { race: Race; predicted: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const state = deriveState(race, predicted);
  const flag = COUNTRY_FLAGS[race.country] || "🏁";
  const thumb = getRaceThumbnail(race);
  const isPast = state === "finished" || state === "cancelled";

  const statusPill =
    state === "needs-prediction"
      ? {
          label: t("race_calendar.status.to_predict"),
          cls: "border-pk-red/40 bg-pk-red/15 text-pk-red",
          Icon: AlertCircle,
        }
      : state === "predicted"
        ? {
            label: t("race_calendar.status.predicted"),
            cls: "border-pk-emerald/30 bg-pk-emerald/12 text-pk-emerald",
            Icon: Check,
          }
        : state === "finished"
          ? {
              label: t("race_calendar.status.finished"),
              cls: "border-white/[0.12] bg-white/[0.06] text-pk-titane",
              Icon: Trophy,
            }
          : state === "cancelled"
            ? {
                label: t("race_calendar.status.cancelled"),
                cls: "border-pk-amber/25 bg-pk-amber/10 text-pk-amber",
                Icon: Ban,
              }
            : {
                label: t("race_calendar.status.closed"),
                cls: "border-white/[0.12] bg-white/[0.06] text-pk-titane",
                Icon: Lock,
              };
  const { Icon: PillIcon } = statusPill;

  return (
    <motion.div
      variants={fadeUp}
      className={`flex flex-col overflow-hidden rounded-lg border bg-pk-surface ${
        state === "needs-prediction"
          ? "border-pk-red/45 shadow-[0_0_0_1px_rgba(225,6,0,0.18)]"
          : "border-white/[0.08]"
      }`}
      data-testid={`course-card-${race.id}`}
      data-state={state}
    >
      {/* Tap → fiche course / programme */}
      <button
        type="button"
        onClick={() => {
          haptic("light");
          navigate(`/race/${race.id}`);
        }}
        className="group relative block text-left"
        aria-label={t("race_calendar.aria_race", { name: race.name })}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {thumb ? (
            <img
              src={thumb}
              alt={race.name}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                isPast ? "opacity-55 grayscale-[0.4]" : ""
              }`}
            />
          ) : (
            <div className="h-full w-full bg-pk-anthracite" />
          )}
          {/* Layered gradient for centered title readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
          <span
            className={`absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.05em] backdrop-blur-sm ${statusPill.cls}`}
          >
            {state === "needs-prediction" && (
              <span className="h-1 w-1 animate-[pulse-dot_2s_ease-in-out_infinite] rounded-full bg-pk-red" />
            )}
            <PillIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
            {statusPill.label}
          </span>
          {race.is_sprint_weekend && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-pk-amber/90 px-1.5 py-0.5 font-mono text-[0.4375rem] font-bold uppercase tracking-[0.08em] text-pk-carbon">
              Sprint
            </span>
          )}
          {/* Centered title */}
          <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
            <span className="text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">{flag}</span>
            <p className="mt-0.5 text-center font-display text-[0.9375rem] uppercase leading-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
              {shortName(race.name)}
            </p>
            <p className="mt-1 font-mono text-[0.5rem] uppercase tracking-[0.06em] text-white/70 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
              {formatDate(race.date)} · {race.circuit}
            </p>
          </div>
        </div>
      </button>

      {/* Footer action — pronostiquer / modifier / résultats / verrouillé */}
      <div className="mt-auto border-t border-white/[0.06] p-2">
        {state === "finished" ? (
          <button
            onClick={() => navigate(`/results/${race.id}`)}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-white/[0.05] font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-piste transition-colors hover:bg-white/[0.1]"
          >
            <Trophy className="h-3 w-3 text-pk-gold" /> {t("race_calendar.cta.results")}
          </button>
        ) : state === "cancelled" ? (
          <div className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-pk-amber/10 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-amber">
            <Ban className="h-3 w-3" /> {t("race_calendar.cta.cancelled")}
          </div>
        ) : state === "locked" ? (
          <div className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-white/[0.04] font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-titane">
            <Lock className="h-3 w-3" /> {t("race_calendar.cta.locked")}
          </div>
        ) : state === "predicted" ? (
          <button
            onClick={() => {
              haptic("light");
              navigate(`/predictions/${race.id}`);
            }}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-pk-amber/40 bg-pk-amber/10 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-pk-amber transition-colors hover:bg-pk-amber/15"
          >
            <Pencil className="h-3 w-3" /> {t("race_calendar.cta.edit")}
          </button>
        ) : (
          <button
            onClick={() => {
              haptic("medium");
              navigate(`/predictions/${race.id}`);
            }}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-pk-red font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-white transition-transform active:scale-[0.98]"
          >
            <Target className="h-3 w-3" /> {t("race_calendar.cta.predict")}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page ──────────────────────────────────────────────── */

export default function RaceCalendarPage() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);
  const [filter, setFilter] = useState<FilterKey>("upcoming");
  const queryClient = useQueryClient();
  const FILTERS = useFilters();

  const { data: races = [], isLoading: racesLoading } = useQuery({
    queryKey: queryKeys.races.list(),
    queryFn: async () => (await api.races.list()) || [],
  });

  // Return a plain string[] — TanStack Query serialises cache values to JSON,
  // and a Set round-trips as {} (always falsy via instanceof Set). Same queryKey
  // as useDashboardData so the home carousel and calendar share the cache entry.
  const { data: predictedIds = [], isLoading: predsLoading } = useQuery({
    queryKey: ["/predictions/history"],
    queryFn: async () => {
      const data = await api.predictions.history();
      return (data || []).map((p: { race_id: string }) => String(p.race_id));
    },
  });
  const predictedSet = useMemo(
    () => new Set(Array.isArray(predictedIds) ? predictedIds : []),
    [predictedIds],
  );

  const loading = racesLoading || predsLoading;

  usePullToRefresh({
    enabled: !loading,
    onRefresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.races.list() }),
  });

  const sorted = useMemo(() => {
    const byDate = (a: Race, b: Race) => new Date(a.date).getTime() - new Date(b.date).getTime();
    return [...races].sort(byDate);
  }, [races]);

  const counts = useMemo(() => {
    const upcoming = sorted.filter(
      (r) => r.status === "upcoming" || r.status === "in_progress",
    ).length;
    const completed = sorted.filter(
      (r) => r.status === "finished" || r.status === "cancelled" || r.is_cancelled,
    ).length;
    return { upcoming, completed, all: sorted.length };
  }, [sorted]);

  const filteredRaces = useMemo(() => {
    if (filter === "upcoming")
      return sorted.filter((r) => r.status === "upcoming" || r.status === "in_progress");
    if (filter === "completed")
      return sorted.filter(
        (r) => r.status === "finished" || r.status === "cancelled" || r.is_cancelled,
      );
    return sorted;
  }, [sorted, filter]);

  if (loading) return <CalendarSkeleton />;

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="race-calendar-page">
      <div className="ptr-indicator" aria-hidden="true">
        <RotateCw className="h-4 w-4 text-white" />
      </div>

      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-3">
          <h1 className="mb-0.5 flex items-center gap-2 font-display text-lg">
            <Calendar className="h-4 w-4 text-pk-red" />
            {t("race_calendar.title")}
          </h1>
          <p className="mb-2.5 text-[0.625rem] text-pk-titane">{t("race_calendar.subtitle")}</p>

          <div className="flex gap-1.5">
            {FILTERS.map((f) => {
              const count =
                f.key === "upcoming"
                  ? counts.upcoming
                  : f.key === "completed"
                    ? counts.completed
                    : counts.all;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    haptic("selection");
                    setFilter(f.key);
                  }}
                  className={`flex-1 rounded-full border py-1.5 text-center font-data text-[0.5625rem] transition-colors ${
                    filter === f.key
                      ? "border-pk-red/30 bg-pk-red-subtle text-pk-red"
                      : "border-white/[0.08] bg-white/[0.04] text-pk-titane"
                  }`}
                  data-testid={`calendar-filter-${f.key}`}
                >
                  {f.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Race grid ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          className="grid grid-cols-2 gap-3 px-4 pt-3"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          {...rmProps}
        >
          {filteredRaces.length === 0 ? (
            <div className="col-span-2">
              <EmptyFullPage
                Icon={Calendar}
                title={t("race_calendar.empty_title")}
                description={
                  filter === "upcoming"
                    ? t("race_calendar.empty_season_over")
                    : t("race_calendar.empty_none")
                }
              />
            </div>
          ) : (
            filteredRaces.map((race: Race) => (
              <RaceGridCard
                key={race.id}
                race={race}
                predicted={predictedSet.has(String(race.id))}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
