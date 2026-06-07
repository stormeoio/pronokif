/**
 * MiniGamesPage — Reaction & Batak mini-games hub.
 * Broadcast Premium: glass header, pk-* cards, chip tabs.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Zap, Target, Trophy, Dumbbell } from "lucide-react";
import { ReactionGame, BatakGame } from "../components/mini-games/MiniGames";
import { useMiniGamesData } from "./mini-games/useMiniGamesData";
import { MiniGamesLeaderboard } from "./mini-games/MiniGamesLeaderboard";
import { useAuth } from "@/lib/auth";
import { haptic } from "@/lib/haptics";
import { staggerContainer, fadeUp } from "@/lib/motion";

/* -- Skeleton ----------------------------------------------------------- */

function MiniGamesSkeleton() {
  return (
    <div className="min-h-screen bg-pk-carbon">
      <div className="h-14 bg-pk-surface animate-shimmer" />
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-pk-surface border border-white/[0.08] animate-shimmer"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* -- Component ---------------------------------------------------------- */

export default function MiniGamesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"reaction" | "batak">("reaction");
  const [mode, setMode] = useState<"training" | "competition">("training");

  const {
    loading,
    nextRace,
    leagues,
    reactionAttempts,
    batakAttempts,
    reactionLeaderboard,
    batakLeaderboard,
    globalReactionLeaderboard,
    globalBatakLeaderboard,
    handleReactionSubmit,
    handleBatakSubmit,
  } = useMiniGamesData();

  const handleTabChange = (tab: "reaction" | "batak") => {
    haptic("selection");
    setActiveTab(tab);
  };

  const handleModeChange = (m: "training" | "competition") => {
    haptic("selection");
    setMode(m);
  };

  if (loading) return <MiniGamesSkeleton />;

  const leagueLeaderboard = activeTab === "reaction" ? reactionLeaderboard : batakLeaderboard;
  const globalLeaderboard =
    activeTab === "reaction" ? globalReactionLeaderboard : globalBatakLeaderboard;

  return (
    <div className="min-h-screen bg-pk-carbon pb-24" data-testid="minigames-page">
      {/* Glass Header */}
      <div className="sticky top-0 z-40 bg-pk-carbon/85 backdrop-blur-xl saturate-[1.3] border-b border-white/[0.08]">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 rounded-lg text-pk-titane hover:text-pk-piste transition-colors"
              data-testid="minigames-back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-display text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-pk-amber" />
                {t("mini_games.title")}
              </h1>
              {nextRace && (
                <p className="font-data text-[0.5625rem] text-pk-titane">
                  {t("mini_games.weekend", { name: nextRace.name.replace(" Grand Prix", "") })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="max-w-2xl mx-auto px-4 pt-4 space-y-4"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        {/* Rewards Info Card */}
        <motion.div
          variants={fadeUp}
          className="bg-pk-amber/[0.06] border border-pk-amber/20 rounded-lg p-4"
        >
          <h3 className="font-display text-xs flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-pk-amber" /> {t("mini_games.rewards")}
          </h3>
          <ul className="font-data text-[0.5625rem] text-pk-titane space-y-1">
            <li>{t("mini_games.reward_competition")}</li>
            <li>
              {t("mini_games.reward_winner")} <span className="text-pk-amber">+2 points</span>
            </li>
            <li>{t("mini_games.reward_xp")}</li>
            <li>{t("mini_games.reward_training")}</li>
          </ul>
        </motion.div>

        {/* Mode Toggle */}
        <motion.div className="grid grid-cols-2 gap-2" variants={fadeUp}>
          <button
            onClick={() => handleModeChange("training")}
            className={`h-11 rounded-lg font-display text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
              mode === "training"
                ? "bg-pk-info text-white shadow-lg"
                : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
            }`}
            data-testid="mode-training"
          >
            <Dumbbell className="w-4 h-4" />
            {t("mini_games.modes.training")}
          </button>
          <button
            onClick={() => handleModeChange("competition")}
            className={`h-11 rounded-lg font-display text-sm transition-all flex items-center justify-center gap-2 active:scale-[0.97] ${
              mode === "competition"
                ? "bg-pk-amber text-pk-carbon shadow-lg"
                : "bg-white/[0.04] border border-white/[0.08] text-pk-titane hover:text-pk-piste"
            }`}
            data-testid="mode-competition"
          >
            <Trophy className="w-4 h-4" />
            {t("mini_games.modes.competition")}
          </button>
        </motion.div>

        {/* Game Tabs */}
        <motion.div className="grid grid-cols-2 gap-2" variants={fadeUp}>
          <button
            onClick={() => handleTabChange("reaction")}
            className={`p-3 rounded-lg border transition-all text-center ${
              activeTab === "reaction"
                ? "bg-pk-amber/[0.08] border-pk-amber/30"
                : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
            }`}
            data-testid="tab-reaction"
          >
            <Zap
              className={`w-5 h-5 mx-auto mb-1 ${activeTab === "reaction" ? "text-pk-amber" : "text-pk-titane"}`}
            />
            <p
              className={`font-display text-xs ${activeTab === "reaction" ? "text-white" : "text-pk-titane"}`}
            >
              {t("mini_games.games.reaction")}
            </p>
          </button>
          <button
            onClick={() => handleTabChange("batak")}
            className={`p-3 rounded-lg border transition-all text-center ${
              activeTab === "batak"
                ? "bg-pk-info/[0.08] border-pk-info/30"
                : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"
            }`}
            data-testid="tab-batak"
          >
            <Target
              className={`w-5 h-5 mx-auto mb-1 ${activeTab === "batak" ? "text-pk-info" : "text-pk-titane"}`}
            />
            <p
              className={`font-display text-xs ${activeTab === "batak" ? "text-white" : "text-pk-titane"}`}
            >
              {t("mini_games.games.batak")}
            </p>
          </button>
        </motion.div>

        {/* Active Game */}
        <motion.div variants={fadeUp}>
          <AnimatePresence mode="wait">
            {activeTab === "reaction" ? (
              <motion.div
                key="reaction"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <ReactionGame
                  onSubmit={handleReactionSubmit}
                  attemptsRemaining={
                    mode === "competition" ? reactionAttempts.remaining : undefined
                  }
                  isTraining={mode === "training"}
                />
              </motion.div>
            ) : (
              <motion.div
                key="batak"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <BatakGame
                  onSubmit={handleBatakSubmit}
                  attemptsRemaining={mode === "competition" ? batakAttempts.remaining : undefined}
                  isTraining={mode === "training"}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={fadeUp}>
          <MiniGamesLeaderboard
            activeTab={activeTab}
            mode={mode}
            leagueName={leagues[0]?.name}
            userId={user?.id}
            leagueLeaderboard={leagueLeaderboard}
            globalLeaderboard={globalLeaderboard}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
