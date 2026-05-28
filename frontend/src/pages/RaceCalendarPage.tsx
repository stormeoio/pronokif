/**
 * Race Calendar — V1 List (vertical timeline).
 * Broadcast Premium theme.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Calendar, MapPin, Clock, Check, Lock, Target } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
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
  Italy: "🇮🇹",
  Monaco: "🇲🇨",
  Spain: "🇪🇸",
  Canada: "🇨🇦",
  Austria: "🇦🇹",
  UK: "🇬🇧",
  Belgium: "🇧🇪",
  Hungary: "🇭🇺",
  Netherlands: "🇳🇱",
  Azerbaijan: "🇦🇿",
  Singapore: "🇸🇬",
  Mexico: "🇲🇽",
  Brazil: "🇧🇷",
  Qatar: "🇶🇦",
  UAE: "🇦🇪",
};

type FilterKey = "upcoming" | "completed" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Termines" },
  { key: "all", label: "Tous" },
];

/* ── Helpers ───────────────────────────────────────────── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function formatCloseTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── Shimmer Loading ───────────────────────────────────── */

function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 p-4 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="h-5 w-40 rounded bg-pk-anthracite animate-shimmer mb-2" />
        <div className="h-3 w-56 rounded bg-pk-anthracite animate-shimmer mb-3" />
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 flex-1 rounded-full bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="px-4 pt-3 space-y-2 pb-24">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 bg-pk-surface border border-white/[0.08] rounded-lg animate-shimmer"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function RaceCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [filter, setFilter] = useState<FilterKey>("upcoming");

  const { data: races = [], isLoading: racesLoading } = useQuery({
    queryKey: ["/races/upcoming"],
    queryFn: () => api.races.upcoming(),
  });

  const { data: myPredictions = {}, isLoading: predsLoading } = useQuery({
    queryKey: ["/predictions/history"],
    queryFn: async () => {
      const data = await api.predictions.history();
      const predsMap: Record<string, unknown> = {};
      data.forEach((p: { race_id: string }) => {
        predsMap[p.race_id] = p;
      });
      return predsMap;
    },
  });

  const loading = racesLoading || predsLoading;

  const filteredRaces = (() => {
    if (filter === "upcoming")
      return races.filter((r: Race) => r.status === "upcoming" || r.status === "in_progress");
    if (filter === "completed") return races.filter((r: Race) => r.status === "finished");
    return races;
  })();

  const upcomingCount = races.filter(
    (r: Race) => r.status === "upcoming" || r.status === "in_progress",
  ).length;
  const completedCount = races.filter((r: Race) => r.status === "finished").length;

  if (loading) return <CalendarSkeleton />;

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="race-calendar-page">
      {/* ── Glass Header ── */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-3">
          <h1 className="font-display text-lg flex items-center gap-2 mb-0.5">
            <Calendar className="w-4 h-4 text-pk-red" />
            2026 Calendar
          </h1>
          <p className="text-[0.625rem] text-pk-titane mb-2.5">Closes 15 min before FP1</p>

          {/* Filter chips */}
          <div className="flex gap-1.5">
            {FILTERS.map((f) => {
              const count =
                f.key === "upcoming"
                  ? upcomingCount
                  : f.key === "completed"
                    ? completedCount
                    : races.length;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    haptic("selection");
                    setFilter(f.key);
                  }}
                  className={`flex-1 py-1.5 rounded-full text-center font-data text-[0.5625rem] border transition-colors ${
                    filter === f.key
                      ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                      : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
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

      {/* ── Race List ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          className="px-4 pt-3 space-y-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          {...rmProps}
        >
          {filteredRaces.length === 0 ? (
            <EmptyFullPage
              Icon={Calendar}
              title="No races"
              description={filter === "upcoming" ? "Season finished" : "No finished races"}
            />
          ) : (
            filteredRaces.map((race: Race, index: number) => {
              const hasPrediction = !!myPredictions[race.id];
              const canPredict = (race as Race & { can_predict?: boolean }).can_predict;
              const isNextRace = index === 0 && filter === "upcoming";
              const flag = COUNTRY_FLAGS[race.country] || "🏁";

              return (
                <motion.button
                  key={race.id}
                  variants={fadeUp}
                  onClick={() => navigate(`/race/${race.id}`)}
                  className={`w-full text-left bg-pk-surface border rounded-lg overflow-hidden transition-all active:scale-[0.98] ${
                    isNextRace ? "border-pk-red/30 shadow-glow-red" : "border-white/[0.08]"
                  }`}
                >
                  {/* Next race accent */}
                  {isNextRace && <div className="h-0.5 bg-pk-red" />}

                  <div className="flex items-center gap-3 p-3.5">
                    {/* Round badge */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-display text-sm flex-shrink-0 ${
                        race.status === "finished"
                          ? "bg-pk-anthracite text-pk-titane"
                          : isNextRace
                            ? "bg-pk-red text-white"
                            : "bg-pk-anthracite border border-white/[0.08] text-pk-piste"
                      }`}
                    >
                      {flag}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p
                          className={`font-bold text-[0.8125rem] truncate ${
                            race.status === "finished" ? "text-pk-titane" : "text-pk-piste"
                          }`}
                        >
                          {race.name.replace(" Grand Prix", "")}
                        </p>
                        {race.is_sprint_weekend && (
                          <span className="font-data text-[0.4375rem] px-1.5 py-0.5 rounded bg-pk-amber/20 text-pk-amber uppercase flex-shrink-0">
                            Sprint
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[0.625rem] text-pk-titane flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {race.circuit}
                        </span>
                        <span className="text-[0.625rem] text-pk-titane">
                          {formatDate(race.date)}
                        </span>
                      </div>
                      {canPredict && !hasPrediction && (
                        <p className="text-[0.5rem] text-pk-red mt-1 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Cloture: {formatCloseTime(race.predictions_close_at)}
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0">
                      {race.status === "finished" ? (
                        <div className="w-8 h-8 rounded-md bg-pk-anthracite flex items-center justify-center">
                          <Check className="w-4 h-4 text-pk-titane" />
                        </div>
                      ) : hasPrediction ? (
                        <div className="w-8 h-8 rounded-md bg-pk-emerald/[0.12] border border-pk-emerald/25 flex items-center justify-center">
                          <Check className="w-4 h-4 text-pk-emerald" />
                        </div>
                      ) : canPredict ? (
                        <div className="w-8 h-8 rounded-md bg-pk-red/[0.12] border border-pk-red/25 flex items-center justify-center animate-glow-pulse">
                          <Target className="w-4 h-4 text-pk-red" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-pk-anthracite flex items-center justify-center">
                          <Lock className="w-4 h-4 text-pk-titane" />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
