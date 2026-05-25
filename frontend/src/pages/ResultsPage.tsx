import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Trophy, Flag, Calendar, MapPin, Clock } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import AnimatedNumber from "../components/AnimatedNumber";
import ResultComparisonCard from "./results/ResultComparisonCard";
import { api, getApiStatus } from "@/lib/api";
import type { Race } from "@/types/api";

// Lazy-load 3D podium scene (code-split with Three.js chunk)
const PodiumScene = lazy(() => import("../components/three/PodiumScene"));

// Local type matching actual API /results/:id response shape
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

export default function ResultsPage() {
  const { raceId } = useParams();
  const navigate = useNavigate();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-arcade rounded" />
          <div className="h-48 skeleton-arcade rounded-md" />
          <div className="h-64 skeleton-arcade rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main p-4 pt-6 pb-24" data-testid="results-page">
      <motion.div
        className="max-w-2xl mx-auto space-y-6"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
      >
        {/* Header */}
        <motion.div
          className="flex items-center gap-4"
          variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <h1 className="font-heading text-2xl uppercase tracking-tight italic text-white">
            Resultats
          </h1>
        </motion.div>

        {/* Race Selector */}
        {finishedRaces.length > 0 && (
          <motion.div
            className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          >
            {finishedRaces.map((race) => (
              <motion.div key={race.id} whileTap={{ scale: 0.92 }}>
                <Button
                  variant={selectedRace?.id === race.id ? "default" : "outline"}
                  onClick={() => selectRace(race)}
                  className={`flex-shrink-0 rounded-xl transition-all ${
                    selectedRace?.id === race.id
                      ? "bg-primary shadow-lg shadow-primary/20"
                      : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800"
                  }`}
                  data-testid={`race-btn-${race.id}`}
                >
                  {race.name.replace(" Grand Prix", "")}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* No Results Yet */}
        {!selectedRace && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" }}
          >
            <Card className="bg-card border-white/10 glass-card">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="font-heading text-xl uppercase text-zinc-400 mb-2">
                  Aucun resultat disponible
                </p>
                <p className="font-body text-sm text-zinc-500">
                  Les resultats seront disponibles apres chaque course
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Selected Race Info */}
        <AnimatePresence mode="wait">
          {selectedRace && (
            <motion.div
              key={selectedRace.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-card border-white/10 glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-heading text-xl uppercase tracking-tight italic text-white">
                        {selectedRace.name}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 text-zinc-400">
                        <span className="flex items-center gap-1 text-sm font-body">
                          <MapPin className="w-4 h-4" /> {selectedRace.circuit}
                        </span>
                        <span className="flex items-center gap-1 text-sm font-body">
                          <Calendar className="w-4 h-4" />
                          {new Date(selectedRace.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Flag className="w-8 h-8 text-primary opacity-50" />
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Podium Scene */}
        {result && result.results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
          >
            <Suspense
              fallback={
                <div className="h-[180px] w-full rounded-xl bg-zinc-900/50 animate-pulse" />
              }
            >
              <PodiumScene className="rounded-xl overflow-hidden" />
            </Suspense>
          </motion.div>
        )}

        {/* Results Comparison */}
        {result && result.results && (
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
          >
            {/* Points Summary — Animated Reveal */}
            {result.points && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
              >
                <Card className="bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 overflow-hidden glass-card">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div
                          className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                          initial={{ rotate: -10, scale: 0.8 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: "spring", delay: 0.3 }}
                        >
                          <Trophy className="w-7 h-7 text-white" />
                        </motion.div>
                        <div>
                          <p className="font-body text-xs text-emerald-400/80 uppercase tracking-wider mb-0.5">
                            Score Grand Prix
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="font-heading text-3xl text-white">+</span>
                            <AnimatedNumber
                              value={result.points.total}
                              duration={1500}
                              delay={300}
                              className="font-heading text-3xl text-white"
                            />
                            <span className="font-body text-sm text-emerald-400 ml-1">pts</span>
                          </div>
                        </div>
                      </div>
                      {result.points.xp_earned && (
                        <div className="text-right">
                          <span className="font-data text-sm text-yellow-400">
                            +
                            <AnimatedNumber
                              value={result.points.xp_earned}
                              delay={800}
                              className=""
                            />{" "}
                            XP
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Qualifications */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <ResultComparisonCard
                title="Qualifications"
                icon={<Flag className="w-5 h-5 text-primary" />}
                winnerLabel="Pole Position"
                winnerId={result.results.quali_pole}
                predictionWinnerId={result.prediction?.quali_pole}
                top3={qualiTop3}
                predictionTop3={predictionQualiTop3}
                getDriverName={getDriverName}
              />
            </motion.div>

            {/* Course */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <ResultComparisonCard
                title="Course"
                icon={<Trophy className="w-5 h-5 text-amber-500" />}
                winnerLabel="Vainqueur"
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
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Card className="bg-card border-white/10 glass-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-lg uppercase tracking-tight">
                      Detail des points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      className="space-y-2"
                      initial="hidden"
                      animate="visible"
                      variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
                    >
                      {result.points.details.map((detail: string, i: number) => (
                        <motion.div
                          key={i}
                          className="flex items-center justify-between text-sm"
                          variants={{
                            hidden: { opacity: 0, x: -10 },
                            visible: { opacity: 1, x: 0 },
                          }}
                        >
                          <span className="font-body text-zinc-300">{detail}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* No Results for selected race */}
        {selectedRace && !result?.results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring" }}
          >
            <Card className="bg-card border-white/10 glass-card">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="font-heading text-lg uppercase text-zinc-400 mb-2">
                  Resultats en attente
                </p>
                <p className="font-body text-sm text-zinc-500">
                  Les resultats seront disponibles apres la course
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* No Prediction Warning */}
        {selectedRace && result?.results && !result.prediction && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-amber-500/10 border-amber-500/20 glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p className="font-body text-amber-500 text-sm">
                  Tu n'as pas fait de pronostics pour cette course
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
