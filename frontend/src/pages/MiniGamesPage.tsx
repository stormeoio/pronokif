import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Zap, Target, Trophy, Dumbbell } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ReactionGame, BatakGame } from "../components/mini-games/MiniGames";
import { useMiniGamesData } from "./mini-games/useMiniGamesData";
import { MiniGamesLeaderboard } from "./mini-games/MiniGamesLeaderboard";
import { useAuth } from "@/lib/auth";

export default function MiniGamesPage() {
  const navigate = useNavigate();
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
    getAvatarById,
  } = useMiniGamesData();

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-arcade rounded" />
          <div className="h-64 skeleton-arcade rounded-md" />
        </div>
      </div>
    );
  }

  const leagueLeaderboard = activeTab === "reaction" ? reactionLeaderboard : batakLeaderboard;
  const globalLeaderboard =
    activeTab === "reaction" ? globalReactionLeaderboard : globalBatakLeaderboard;

  return (
    <div className="min-h-screen bg-app-main pb-24" data-testid="minigames-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#050a14]/95 backdrop-blur-md border-b border-purple-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-500" />
                Mini-Jeux
              </h1>
              {nextRace && (
                <p className="font-body text-xs text-gray-400">
                  Weekend: {nextRace.name.replace(" Grand Prix", "")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Info Card - Récompenses */}
        <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
          <CardContent className="p-4">
            <h3 className="font-heading text-sm uppercase text-yellow-500 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Récompenses
            </h3>
            <ul className="font-body text-xs text-gray-400 space-y-1">
              <li>• Mode compétition: 3 essais par jeu et par weekend</li>
              <li>
                • Le gagnant de chaque jeu dans la ligue gagne{" "}
                <span className="text-orange-400">+2 points</span>
              </li>
              <li>• XP gagné à chaque partie jouée</li>
              <li>• Mode entraînement illimité pour s'améliorer!</li>
            </ul>
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            onClick={() => setMode("training")}
            className={`flex-1 h-12 font-heading uppercase ${
              mode === "training"
                ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white border-2 border-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.5)]"
                : "bg-gray-800/50 text-gray-500 border-2 border-gray-700 hover:bg-gray-700/50 hover:text-gray-300"
            }`}
          >
            <Dumbbell className="w-5 h-5 mr-2" />
            Entraînement
          </Button>
          <Button
            onClick={() => setMode("competition")}
            className={`flex-1 h-12 font-heading uppercase ${
              mode === "competition"
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)]"
                : "bg-gray-800/50 text-gray-500 border-2 border-gray-700 hover:bg-gray-700/50 hover:text-gray-300"
            }`}
          >
            <Trophy className="w-5 h-5 mr-2" />
            Compétition
          </Button>
        </div>

        {/* Game Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("reaction")}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              activeTab === "reaction"
                ? "border-orange-500 bg-orange-500/20"
                : "border-gray-700 bg-gray-900/50"
            }`}
          >
            <Zap
              className={`w-6 h-6 mx-auto mb-1 ${activeTab === "reaction" ? "text-orange-500" : "text-gray-500"}`}
            />
            <p
              className={`font-heading text-sm uppercase ${activeTab === "reaction" ? "text-white" : "text-gray-400"}`}
            >
              Reaction
            </p>
          </button>
          <button
            onClick={() => setActiveTab("batak")}
            className={`flex-1 p-3 rounded-lg border-2 transition-all ${
              activeTab === "batak"
                ? "border-cyan-500 bg-cyan-500/20"
                : "border-gray-700 bg-gray-900/50"
            }`}
          >
            <Target
              className={`w-6 h-6 mx-auto mb-1 ${activeTab === "batak" ? "text-cyan-500" : "text-gray-500"}`}
            />
            <p
              className={`font-heading text-sm uppercase ${activeTab === "batak" ? "text-white" : "text-gray-400"}`}
            >
              Batak
            </p>
          </button>
        </div>

        {/* Active Game */}
        {activeTab === "reaction" ? (
          <ReactionGame
            onSubmit={handleReactionSubmit}
            attemptsRemaining={mode === "competition" ? reactionAttempts.remaining : undefined}
            isTraining={mode === "training"}
          />
        ) : (
          <BatakGame
            onSubmit={handleBatakSubmit}
            attemptsRemaining={mode === "competition" ? batakAttempts.remaining : undefined}
            isTraining={mode === "training"}
          />
        )}

        {/* Leaderboard */}
        <MiniGamesLeaderboard
          activeTab={activeTab}
          mode={mode}
          leagueName={leagues[0]?.name}
          userId={user?.id}
          leagueLeaderboard={leagueLeaderboard}
          globalLeaderboard={globalLeaderboard}
          getAvatarById={getAvatarById}
        />
      </div>
    </div>
  );
}
