/**
 * ChampionshipPage — F1 championship standings hub.
 * Broadcast Premium: glass header, pk-* chip tabs, stagger animations.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Flag, Trophy, RefreshCw, Loader2, Car, Calendar, GitCompare } from "lucide-react";
import DriverStandings from "./DriverStandings";
import ConstructorStandings from "./ConstructorStandings";
import SeasonProgress from "./SeasonProgress";
import { useChampionshipData } from "./useChampionshipData";
import { haptic } from "@/lib/haptics";
import { fadeUp, staggerContainer, getReducedMotionProps } from "@/lib/motion";

/* ── Skeleton ─────────────────────────────────────────── */

function ChampionshipSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl border-b border-white/[0.08] px-4 pt-3 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pk-anthracite animate-shimmer" />
          <div className="space-y-1.5">
            <div className="h-5 w-36 rounded bg-pk-anthracite animate-shimmer" />
            <div
              className="h-3 w-20 rounded bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: "80ms" }}
            />
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3 pb-24">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 flex-1 rounded-lg bg-pk-anthracite animate-shimmer"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────── */

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion() ?? false;
  const rmProps = getReducedMotionProps(prefersReducedMotion);
  const [activeTab, setActiveTab] = useState("drivers");

  const {
    loading,
    refreshing,
    season,
    driversStandings,
    constructorsStandings,
    raceSchedule,
    refetchAll,
    lastUpdated,
  } = useChampionshipData();

  const handleRefresh = async () => {
    haptic("selection");
    await refetchAll();
    toast.success("Leaderboards mis a jour !");
  };

  const handleTabChange = (key: string) => {
    haptic("light");
    setActiveTab(key);
  };

  if (loading) return <ChampionshipSkeleton />;

  const tabs = [
    { key: "drivers", label: "Drivers", Icon: Trophy },
    { key: "constructors", label: "Ecuries", Icon: Car },
    { key: "results", label: "Resultats", Icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="championship-page">
      {/* Glass Header */}
      <header className="sticky top-0 z-50 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pk-red rounded-lg flex items-center justify-center shadow-glow-red">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-display text-lg">Championnat F1</h1>
                <p className="font-data text-[0.5625rem] text-pk-titane">Season {season}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg text-pk-titane hover:text-pk-piste hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                data-testid="championship-refresh"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => {
                  haptic("light");
                  navigate("/compare");
                }}
                className="p-2 rounded-lg text-pk-info hover:bg-pk-info/[0.1] transition-colors"
                title="Compare drivers"
                data-testid="championship-compare"
              >
                <GitCompare className="w-5 h-5" />
              </button>
            </div>
          </div>

          {lastUpdated && (
            <p className="font-data text-[0.5rem] text-pk-titane mt-1.5">
              Mise a jour: {lastUpdated.toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </header>

      {/* Content */}
      <motion.div
        className="max-w-2xl mx-auto px-4 pt-4 space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        {...rmProps}
      >
        {/* Tab Toggle */}
        <motion.div variants={fadeUp} className="flex gap-1.5">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex-1 py-2.5 rounded-lg font-display text-xs transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === key
                  ? "bg-pk-red-subtle border border-pk-red/30 text-pk-red"
                  : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "drivers" && <DriverStandings driversStandings={driversStandings} />}
            {activeTab === "constructors" && (
              <ConstructorStandings constructorsStandings={constructorsStandings} />
            )}
            {activeTab === "results" && <SeasonProgress raceSchedule={raceSchedule} />}
          </motion.div>
        </AnimatePresence>

        {/* API Attribution */}
        <motion.p
          variants={fadeUp}
          className="font-data text-[0.5rem] text-pk-titane text-center pt-4"
        >
          Data provided by Jolpica F1 API & OpenF1
        </motion.p>
      </motion.div>
    </div>
  );
}
