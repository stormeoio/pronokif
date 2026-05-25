import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronRight,
  Calendar,
  MapPin,
  Flag,
  Clock,
  Check,
  Lock,
  Zap,
  Trophy,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { getRaceThumbnail } from "@/lib/raceThumbnails";
import type { Race } from "@/types/api";

// Country flag emojis mapping
const COUNTRY_FLAGS = {
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

export default function RaceCalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filter, setFilter] = useState<"upcoming" | "all" | "completed">("upcoming");

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

  const getFilteredRaces = () => {
    if (filter === "upcoming") {
      return races.filter((r) => r.status === "upcoming" || r.status === "in_progress");
    }
    if (filter === "completed") {
      return races.filter((r) => r.status === "finished");
    }
    return races;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const formatCloseTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredRaces = getFilteredRaces();
  const upcomingCount = races.filter(
    (r) => r.status === "upcoming" || r.status === "in_progress",
  ).length;
  const completedCount = races.filter((r) => r.status === "finished").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-12 skeleton-arcade rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 skeleton-arcade rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-app-main pb-24"
      data-testid="race-calendar-page"
      aria-labelledby="calendar-title"
    >
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-red-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <h1
            id="calendar-title"
            className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2"
          >
            <Calendar className="w-5 h-5 text-red-500" aria-hidden="true" />
            Calendrier F1 2026
          </h1>
          <p className="font-body text-xs text-gray-400 mt-1">
            Pronostique en avance sur tous les GP • Clôture 15min avant FP1
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="flex gap-2" role="tablist" aria-label="Filtrer les courses">
            <button
              onClick={() => setFilter("upcoming")}
              role="tab"
              aria-selected={filter === "upcoming"}
              className={`flex-1 py-2 px-3 rounded-lg font-body text-sm transition-all ${
                filter === "upcoming"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              À venir ({upcomingCount})
            </button>
            <button
              onClick={() => setFilter("completed")}
              role="tab"
              aria-selected={filter === "completed"}
              className={`flex-1 py-2 px-3 rounded-lg font-body text-sm transition-all ${
                filter === "completed"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Terminés ({completedCount})
            </button>
            <button
              onClick={() => setFilter("all")}
              role="tab"
              aria-selected={filter === "all"}
              className={`flex-1 py-2 px-3 rounded-lg font-body text-sm transition-all ${
                filter === "all"
                  ? "bg-red-500 text-white shadow-lg"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              Tous ({races.length})
            </button>
          </div>
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto p-4 space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        key={filter}
      >
        {filteredRaces.length === 0 ? (
          <motion.div
            className="card-arcade p-8 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="font-heading text-lg uppercase text-gray-400">Aucune course</p>
            <p className="font-body text-sm text-gray-500 mt-2">
              {filter === "upcoming"
                ? "Toutes les courses sont terminées"
                : "Aucune course terminée"}
            </p>
          </motion.div>
        ) : (
          filteredRaces.map((race, index) => {
            const hasPrediction = !!myPredictions[race.id];
            const canPredict = (race as Race & { can_predict?: boolean }).can_predict;
            const isNextRace = index === 0 && filter === "upcoming";
            const flag = (COUNTRY_FLAGS as Record<string, string>)[race.country] || "🏁";
            const raceThumbnail = getRaceThumbnail(race);

            return (
              <motion.div
                key={race.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.97 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
                  },
                }}
                className={`card-arcade overflow-hidden transition-all glass-card ${
                  isNextRace ? "ring-2 ring-red-500/50 animated-border" : ""
                }`}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {raceThumbnail && (
                  <button
                    type="button"
                    onClick={() => navigate(`/race/${race.id}`)}
                    className="relative block aspect-[16/9] w-full overflow-hidden border-b border-white/[0.08]"
                    aria-label={`Voir ${race.name}`}
                  >
                    <img
                      src={raceThumbnail}
                      alt={`Vignette ${race.name}`}
                      className={`h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03] ${
                        race.status === "finished" ? "opacity-60 saturate-[0.75]" : ""
                      }`}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050a14]/80 via-transparent to-[#050a14]/20" />
                    <div className="absolute left-3 top-3 rounded-sm border border-white/15 bg-black/55 px-2 py-1 font-data text-[0.6875rem] text-white backdrop-blur">
                      #{index + 1}
                    </div>
                    {isNextRace && (
                      <div className="absolute right-3 top-3 rounded-sm border border-red-500/40 bg-red-500/20 px-2 py-1 font-heading text-[0.625rem] uppercase tracking-wider text-white backdrop-blur">
                        Prochain GP
                      </div>
                    )}
                  </button>
                )}

                {/* Race header with country flag */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Round number */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-heading text-lg ${
                        race.status === "finished"
                          ? "bg-gray-700 text-gray-400"
                          : isNextRace
                            ? "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-lg"
                            : "bg-gradient-to-br from-blue-600 to-blue-800 text-white"
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{flag}</span>
                        <h3
                          className={`font-heading text-base uppercase truncate ${
                            race.status === "finished" ? "text-gray-400" : "text-white"
                          }`}
                        >
                          {race.name.replace(" Grand Prix", "")}
                        </h3>
                        {race.is_sprint_weekend && (
                          <span className="flex-shrink-0 bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded-full font-heading uppercase">
                            Sprint
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-body text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {race.circuit}
                        </span>
                        <span className="font-body text-gray-400 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> {formatDate(race.date)}
                        </span>
                      </div>

                      {/* Prediction close info */}
                      {canPredict && (
                        <p className="font-body text-[10px] text-cyan-400 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Clôture: {formatCloseTime(race.predictions_close_at)}
                        </p>
                      )}
                    </div>

                    {/* Status / Action */}
                    <div className="flex-shrink-0">
                      {race.status === "finished" ? (
                        <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                          <Check className="w-5 h-5 text-gray-500" />
                        </div>
                      ) : hasPrediction ? (
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                      ) : canPredict ? (
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center animate-pulse">
                          <Target className="w-5 h-5 text-red-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                {race.status !== "finished" && (
                  <>
                    <div className="h-[1px] bg-gray-700/50" />
                    <div className="p-3 bg-white/[0.02]">
                      {canPredict ? (
                        <Button
                          onClick={() => navigate(`/predictions/${race.id}`)}
                          className={`w-full h-10 font-heading uppercase tracking-wider text-sm ${
                            hasPrediction ? "btn-gold" : "btn-racing"
                          }`}
                          data-testid={`predict-btn-${race.id}`}
                        >
                          {hasPrediction ? (
                            <>Modifier mes pronos</>
                          ) : (
                            <>
                              Faire mes pronos <ChevronRight className="w-4 h-4 ml-1" />
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="text-center py-1">
                          <span className="font-body text-xs text-gray-500 flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" />
                            Pronostics fermés
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Kerb stripe for next race */}
                {isNextRace && <div className="h-1.5 bg-kerb-stripe" />}
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
}
