/**
 * ResultsPage — Race results with predictions comparison.
 * Broadcast Premium theme: glass header, pk-* cards, timeline layout.
 */
import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, Trophy, Flag, Calendar, MapPin, Clock } from "lucide-react";
import AnimatedNumber from "../components/AnimatedNumber";
import ResultComparisonCard from "./results/ResultComparisonCard";
import { api, getApiStatus } from "@/lib/api";
import type { Race } from "@/types/api";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";
import { EmptyFullPage } from "@/components/EmptyState";

const PodiumScene = lazy(() => import("../components/three/PodiumScene"));

/* ── Types ─────────────────────────────────────────────── */

interface ResultData {
  results: {
    quali_pole: string;
    quali_top3?: string[];
    quali_top10: string[];
    race_winner: string;
    race_top3?: string[];
    race_top10: string[];
    bonus?: {
      safety_car?: boolean | null;
      dnf_drivers?: string[];
      fastest_lap?: string | null;
      first_corner_leader?: string | null;
    };
  };
  prediction?: {
    quali_pole: string;
    quali_top3?: string[];
    quali_top10?: string[];
    race_winner: string;
    race_top3?: string[];
    race_top10?: string[];
  };
  points?: {
    total: number;
    details: string[];
    xp_earned?: number;
  };
}

/* ── Skeleton ──────────────────────────────────────────── */

function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08] px-4 pt-3 pb-3">
        <div className="h-5 w-24 rounded bg-pk-anthracite animate-shimmer" />
      </div>
      <div className="px-4 pt-4 space-y-3 pb-24">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-24 rounded-full bg-pk-anthracite animate-shimmer flex-shrink-0"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        <div className="h-24 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer" />
        <div className="h-48 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer" />
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function ResultsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);

  const [manualRaceId, setManualRaceId] = useState<string | null>(null);

  const { data: races = [], isLoading: racesLoading } = useQuery({
    queryKey: ["/races"],
    queryFn: () => api.races.list(),
    refetchInterval: 60_000,
  });

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ["/drivers"],
    queryFn: () => api.drivers.list(),
  });

  const selectedRace = useMemo(() => {
    const effectiveId = raceId || manualRaceId;
    if (effectiveId) return races.find((r) => r.id === effectiveId) || null;
    const finishedRaces = races.filter((r) => r.status === "finished");
    return finishedRaces.length > 0 ? finishedRaces[finishedRaces.length - 1] : null;
  }, [races, raceId, manualRaceId]);

  const { data: result = null } = useQuery<ResultData | null>({
    queryKey: ["/results", selectedRace?.id],
    queryFn: async () => {
      try {
        return (await api.results.get(String(selectedRace!.id))) as unknown as ResultData;
      } catch (error) {
        if (getApiStatus(error) === 404) return null;
        throw error;
      }
    },
    enabled: !!selectedRace?.id,
    refetchInterval: (query) => (query.state.data?.results ? false : 30_000),
  });

  const loading = racesLoading || driversLoading;

  const selectRace = (race: Race) => {
    haptic("selection");
    setManualRaceId(race.id);
    navigate(`/results/${race.id}`, { replace: true });
  };

  const getDriverName = (driverId: string | number): string => {
    const driver = drivers.find((d) => d.id === String(driverId));
    return driver?.name || String(driverId);
  };

  const qualiTop3 = result?.results?.quali_top3 ?? result?.results?.quali_top10?.slice(0, 3);
  const raceTop3 = result?.results?.race_top3 ?? result?.results?.race_top10?.slice(0, 3);
  const predictionQualiTop3 =
    result?.prediction?.quali_top3 ?? result?.prediction?.quali_top10?.slice(0, 3);
  const predictionRaceTop3 =
    result?.prediction?.race_top3 ?? result?.prediction?.race_top10?.slice(0, 3);

  const finishedRaces = races.filter((r) => r.status === "finished");

  if (loading) return <ResultsSkeleton />;

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="results-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="results-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg">Resultats</h1>
          </div>

          {/* Race selector chips */}
          {finishedRaces.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2">
              {finishedRaces.map((race) => (
                <button
                  key={race.id}
                  onClick={() => selectRace(race)}
                  className={`font-data text-[0.5625rem] px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors flex-shrink-0 ${
                    selectedRace?.id === race.id
                      ? "bg-pk-red-subtle border-pk-red/30 text-pk-red"
                      : "bg-white/[0.04] border-white/[0.08] text-pk-titane"
                  }`}
                  data-testid={`race-btn-${race.id}`}
                >
                  {race.name.replace(" Grand Prix", "")}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <motion.div
        className="max-w-md mx-auto px-4 pt-4 space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* No Results */}
        {!selectedRace && (
          <EmptyFullPage
            Icon={Clock}
            title="No result"
            description="Results will be available after each race."
          />
        )}

        {/* Selected Race Info */}
        <AnimatePresence mode="wait">
          {selectedRace && (
            <motion.div
              key={selectedRace.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              className="bg-pk-surface border border-white/[0.08] rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-base">{selectedRace.name}</h2>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 font-data text-[0.5625rem] text-pk-titane">
                      <MapPin className="w-3 h-3" /> {selectedRace.circuit}
                    </span>
                    <span className="flex items-center gap-1 font-data text-[0.5625rem] text-pk-titane">
                      <Calendar className="w-3 h-3" />
                      {new Date(selectedRace.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                  </div>
                </div>
                <Flag className="w-5 h-5 text-pk-red/40" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Podium */}
        {result?.results && (
          <motion.div variants={fadeUp}>
            <Suspense
              fallback={
                <div className="h-[180px] w-full rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer" />
              }
            >
              <PodiumScene className="rounded-lg overflow-hidden" />
            </Suspense>
          </motion.div>
        )}

        {/* Results Comparison */}
        {result?.results && (
          <motion.div
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            {...rmProps}
          >
            {/* Points Summary */}
            {result.points && (
              <motion.div
                variants={fadeUp}
                className="bg-pk-emerald/[0.06] border border-pk-emerald/20 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-pk-emerald/[0.15] flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-pk-emerald" />
                    </div>
                    <div>
                      <p className="font-data text-[0.5625rem] text-pk-emerald/80 uppercase tracking-wider">
                        Score Grand Prix
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-2xl">+</span>
                        <AnimatedNumber
                          value={result.points.total}
                          duration={1500}
                          delay={300}
                          className="font-display text-2xl"
                        />
                        <span className="font-data text-sm text-pk-emerald ml-1">pts</span>
                      </div>
                    </div>
                  </div>
                  {result.points.xp_earned != null && (
                    <span className="font-data text-sm text-pk-amber">
                      +<AnimatedNumber value={result.points.xp_earned} delay={800} className="" />{" "}
                      XP
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {/* Qualifications */}
            <motion.div variants={fadeUp}>
              <ResultComparisonCard
                title="Qualifications"
                icon={<Flag className="w-5 h-5 text-pk-red" />}
                winnerLabel="Pole Position"
                winnerId={result.results.quali_pole}
                predictionWinnerId={result.prediction?.quali_pole}
                top3={qualiTop3}
                predictionTop3={predictionQualiTop3}
                getDriverName={getDriverName}
              />
            </motion.div>

            {}
            <motion.div variants={fadeUp}>
              <ResultComparisonCard
                title="Race"
                icon={<Trophy className="w-5 h-5 text-pk-amber" />}
                winnerLabel="Winner"
                winnerId={result.results.race_winner}
                predictionWinnerId={result.prediction?.race_winner}
                top3={raceTop3}
                predictionTop3={predictionRaceTop3}
                getDriverName={getDriverName}
              />
            </motion.div>

            {/* Points Breakdown */}
            {result.points && result.points.details.length > 0 && (
              <motion.div
                variants={fadeUp}
                className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/[0.08]">
                  <h3 className="font-display text-sm">Detail des points</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {result.points.details.map((detail: string, i: number) => (
                    <motion.div
                      key={i}
                      className="text-xs text-pk-titane"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      {detail}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* No Results for selected race */}
        {selectedRace && !result?.results && (
          <EmptyFullPage
            Icon={Clock}
            title="Resultats en attente"
            description="Results will be available after the race."
          />
        )}

        {/* No Prediction Warning */}
        {selectedRace && result?.results && !result.prediction && (
          <motion.div
            variants={fadeUp}
            className="bg-pk-amber/[0.06] border border-pk-amber/20 rounded-lg p-4 flex items-center gap-3"
          >
            <Clock className="w-4 h-4 text-pk-amber flex-shrink-0" />
            <p className="text-xs text-pk-amber">You did not make predictions for this race</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
