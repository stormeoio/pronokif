/**
 * PointsHistory — Expandable race-by-race points breakdown.
 * Broadcast Premium: pk-surface cards, pk-emerald for positive points.
 */
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, History } from "lucide-react";
import { RaceEntityToken } from "@/components/entities/RaceEntityToken";
import { haptic } from "@/lib/haptics";

/* ── Types ─────────────────────────────────────────────── */

interface RaceHistoryEntry {
  race_id: string;
  race_name: string;
  is_sprint_weekend: boolean;
  has_results: boolean;
  total_points: number;
  points_breakdown: {
    quali_pole: { points: number };
    quali_top10: { points: number };
    race_winner: { points: number };
    race_top10: { points: number };
    bonus: { points: number };
  };
  sprint_breakdown?: {
    sprint_quali_top10: { points: number };
    sprint_race_top10: { points: number };
  };
  details?: string[];
}

interface PointsHistoryData {
  summary?: { races_with_results: number };
  history?: RaceHistoryEntry[];
}

interface PointsHistoryProps {
  pointsHistory: PointsHistoryData;
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
}

/* ── Component ─────────────────────────────────────────── */

export default function PointsHistory({
  pointsHistory,
  showHistory,
  setShowHistory,
}: PointsHistoryProps) {
  return (
    <div className="bg-pk-surface border border-white/[0.08] rounded-lg overflow-hidden">
      <button
        onClick={() => {
          haptic("light");
          setShowHistory(!showHistory);
        }}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        data-testid="toggle-points-history"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-pk-emerald/[0.12] flex items-center justify-center">
            <History className="w-4 h-4 text-pk-emerald" />
          </div>
          <div className="text-left">
            <span className="font-display text-sm block">Historique des points</span>
            <span className="font-data text-[0.5625rem] text-pk-titane">
              {pointsHistory.summary?.races_with_results || 0} courses avec résultats
            </span>
          </div>
        </div>
        <ChevronRight
          className={`w-4 h-4 text-pk-titane transition-transform duration-200 ${showHistory ? "rotate-90" : ""}`}
        />
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="border-t border-white/[0.08]"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {pointsHistory.history?.length === 0 ? (
              <div className="p-6 text-center">
                <History className="w-8 h-8 text-pk-titane mx-auto mb-2 opacity-40" />
                <p className="text-xs text-pk-titane">Aucun historique disponible</p>
                <p className="font-data text-[0.5625rem] text-pk-titane/60 mt-0.5">
                  Fais des pronostics pour voir ton historique
                </p>
              </div>
            ) : (
              <motion.div
                className="divide-y divide-white/[0.06] max-h-96 overflow-y-auto"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } }, hidden: {} }}
              >
                {pointsHistory.history?.map((race) => (
                  <RaceHistoryItem key={race.race_id} race={race} />
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Race Item ─────────────────────────────────────────── */

function RaceHistoryItem({ race }: { race: RaceHistoryEntry }) {
  return (
    <motion.div
      className="p-4"
      variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0 } }}
    >
      {/* Race Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <RaceEntityToken
            raceId={race.race_id}
            raceName={race.race_name}
            href={`/results/${race.race_id}`}
            className="font-display text-xs tracking-normal"
          />
          {race.is_sprint_weekend && (
            <span className="font-data text-[0.5rem] bg-pk-amber/20 text-pk-amber px-1.5 py-0.5 rounded uppercase tracking-wider">
              Sprint
            </span>
          )}
        </div>
        <div className="text-right">
          {race.has_results ? (
            <span className="font-data text-lg text-pk-emerald font-bold">
              +{race.total_points}
            </span>
          ) : (
            <span className="font-data text-[0.5625rem] text-pk-titane bg-pk-anthracite px-2 py-1 rounded">
              En attente
            </span>
          )}
        </div>
      </div>

      {/* Points Breakdown */}
      {race.has_results && race.points_breakdown && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <BreakdownItem label="Pole" points={race.points_breakdown.quali_pole.points} />
            <BreakdownItem label="Top 10 Quali" points={race.points_breakdown.quali_top10.points} />
            <BreakdownItem label="Vainqueur" points={race.points_breakdown.race_winner.points} />
            <BreakdownItem label="Top 10 Course" points={race.points_breakdown.race_top10.points} />
          </div>

          {race.is_sprint_weekend && race.sprint_breakdown && (
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <div className="flex justify-between bg-pk-amber/[0.08] border border-pk-amber/15 p-2 rounded text-xs">
                <span className="text-pk-amber/70">Sprint Quali</span>
                <span
                  className={
                    race.sprint_breakdown.sprint_quali_top10.points > 0
                      ? "text-pk-amber"
                      : "text-pk-titane/40"
                  }
                >
                  +{race.sprint_breakdown.sprint_quali_top10.points}
                </span>
              </div>
              <div className="flex justify-between bg-pk-amber/[0.08] border border-pk-amber/15 p-2 rounded text-xs">
                <span className="text-pk-amber/70">Sprint Course</span>
                <span
                  className={
                    race.sprint_breakdown.sprint_race_top10.points > 0
                      ? "text-pk-amber"
                      : "text-pk-titane/40"
                  }
                >
                  +{race.sprint_breakdown.sprint_race_top10.points}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-between bg-purple-500/[0.08] border border-purple-500/15 p-2 rounded text-xs">
            <span className="text-purple-400/70">Bonus (SC, DNF, Tour, T1)</span>
            <span
              className={
                race.points_breakdown.bonus.points > 0 ? "text-purple-400" : "text-pk-titane/40"
              }
            >
              +{race.points_breakdown.bonus.points}
            </span>
          </div>

          {race.details && race.details.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-white/[0.06]">
              <div className="flex flex-wrap gap-1">
                {race.details.map((detail, i) => (
                  <span
                    key={i}
                    className="font-data text-[0.5rem] bg-pk-emerald/[0.1] text-pk-emerald px-1.5 py-0.5 rounded"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ── Breakdown Cell ────────────────────────────────────── */

function BreakdownItem({ label, points }: { label: string; points: number }) {
  return (
    <div className="flex justify-between bg-pk-anthracite/60 p-2 rounded text-xs">
      <span className="text-pk-titane">{label}</span>
      <span className={points > 0 ? "text-pk-emerald font-data" : "text-pk-titane/40 font-data"}>
        +{points}
      </span>
    </div>
  );
}
