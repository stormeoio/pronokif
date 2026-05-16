import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  Zap,
  Target,
  Trophy,
  Medal,
  Dumbbell,
  Timer,
  Crown,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ReactionGame, BatakGame } from "../components/mini-games/MiniGames";
import { AvatarDisplay } from "../components/AvatarDisplay";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function MiniGamesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"reaction" | "batak">("reaction");
  const [mode, setMode] = useState<"training" | "challenge" | "competition">("training");

  // ── Data queries ──────────────────────────────────────────
  const { data: leagues = [] } = useQuery({
    queryKey: ["/leagues/my"],
    queryFn: () => api.leagues.my(),
  });

  const { data: nextRace = null } = useQuery({
    queryKey: ["/races/next"],
    queryFn: () => api.races.next(),
  });

  const { data: avatars = {} as { all?: any[] }, isLoading: loading } = useQuery({
    queryKey: ["/avatars"],
    queryFn: () => api.avatars.list(),
    staleTime: 5 * 60_000,
  });

  const { data: globalReactionLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/global-leaderboard/reaction"],
    queryFn: async () => (await api.minigames.globalLeaderboard("reaction")).leaderboard || [],
  });

  const { data: globalBatakLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/global-leaderboard/batak"],
    queryFn: async () => (await api.minigames.globalLeaderboard("batak")).leaderboard || [],
  });

  // ── Dependent queries (need nextRace) ─────────────────────
  const { data: reactionAttempts = { used: 0, remaining: 3 } } = useQuery({
    queryKey: ["/minigames/attempts/reaction", nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.attempts("reaction", "global", nextRace!.id);
      return { used: res.attempts_used, remaining: res.attempts_remaining };
    },
    enabled: !!nextRace?.id,
  });

  const { data: batakAttempts = { used: 0, remaining: 3 } } = useQuery({
    queryKey: ["/minigames/attempts/batak", nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.attempts("batak", "global", nextRace!.id);
      return { used: res.attempts_used, remaining: res.attempts_remaining };
    },
    enabled: !!nextRace?.id,
  });

  const { data: reactionLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/leaderboard/reaction", leagues[0]?.id, nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.leaderboard("reaction", leagues[0]!.id, nextRace!.id);
      return res.leaderboard || [];
    },
    enabled: !!nextRace?.id && leagues.length > 0,
  });

  const { data: batakLeaderboard = [] } = useQuery({
    queryKey: ["/minigames/leaderboard/batak", leagues[0]?.id, nextRace?.id],
    queryFn: async () => {
      const res = await api.minigames.leaderboard("batak", leagues[0]!.id, nextRace!.id);
      return res.leaderboard || [];
    },
    enabled: !!nextRace?.id && leagues.length > 0,
  });

  // ── Mutations ─────────────────────────────────────────────
  const invalidateCompetition = () => {
    queryClient.invalidateQueries({ queryKey: ["/minigames/attempts"] });
    queryClient.invalidateQueries({ queryKey: ["/minigames/leaderboard"] });
    queryClient.invalidateQueries({ queryKey: ["/minigames/global-leaderboard"] });
  };

  const handleReactionSubmit = async (reactionTime: number, isTraining: boolean) => {
    try {
      await api.minigames.submitReaction({
        race_id: nextRace!.id,
        league_id: "global",
        reaction_time_ms: reactionTime,
        is_training: isTraining,
      });

      if (!isTraining) {
        toast.success(`Temps enregistré: ${reactionTime}ms`);
        invalidateCompetition();
      } else {
        toast.success(`Temps: ${reactionTime}ms (Entraînement)`);
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Erreur",
      );
    }
  };

  const handleBatakSubmit = async (score: number, timeSeconds: number, isTraining: boolean) => {
    try {
      await api.minigames.submitBatak({
        race_id: nextRace!.id,
        league_id: "global",
        score,
        time_seconds: timeSeconds,
        is_training: isTraining,
      });

      if (!isTraining) {
        toast.success(`Score enregistré: ${score} cibles`);
        invalidateCompetition();
      } else {
        toast.success(`Score: ${score} cibles (Entraînement)`);
      }
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Erreur",
      );
    }
  };

  const getAvatarById = (avatarId: string | undefined) => {
    return avatars?.all?.find((a: any) => a.id === avatarId) || null;
  };

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
        {/* Info Card - Récompenses (moved to top) */}
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
        <Card className="game-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-sm uppercase text-cyan-400 flex items-center gap-2">
              <Medal className="w-4 h-4" />
              Classement {activeTab === "reaction" ? "Reaction" : "Batak"}
              {mode === "competition" && leagues[0] && (
                <span className="text-gray-500 text-xs ml-2">({leagues[0].name})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {/* League Leaderboard */}
            {mode === "competition" && (
              <div className="mb-4">
                <p className="font-body text-xs text-gray-500 px-2 mb-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Ligue - Ce weekend
                </p>
                {(activeTab === "reaction" ? reactionLeaderboard : batakLeaderboard).length ===
                0 ? (
                  <p className="font-body text-sm text-gray-500 text-center py-4">
                    Aucun score enregistré pour ce weekend
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(activeTab === "reaction" ? reactionLeaderboard : batakLeaderboard)
                      .slice(0, 10)
                      .map((entry: any, i: any) => (
                        <div
                          key={entry.user_id}
                          className={`flex items-center gap-3 p-2 rounded-lg ${
                            entry.user_id === user?.id
                              ? "bg-orange-500/10 border border-orange-500/30"
                              : ""
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center ${
                              i === 0
                                ? "position-1-gaming"
                                : i === 1
                                  ? "position-2-gaming"
                                  : i === 2
                                    ? "position-3-gaming"
                                    : "bg-gray-700"
                            }`}
                          >
                            <span
                              className={`font-heading text-sm ${i < 3 && i !== 2 ? "text-black" : "text-white"}`}
                            >
                              {entry.position}
                            </span>
                          </div>
                          <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                          <span className="font-body text-sm text-white flex-1 truncate">
                            {entry.username}
                          </span>
                          <span
                            className={`font-data text-sm ${
                              activeTab === "reaction" ? "text-orange-400" : "text-cyan-400"
                            }`}
                          >
                            {activeTab === "reaction"
                              ? `${entry.best_score}ms`
                              : `${entry.best_score} pts`}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Global Leaderboard */}
            <div>
              <p className="font-body text-xs text-gray-500 px-2 mb-2 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Classement Global (All-time)
              </p>
              {(activeTab === "reaction" ? globalReactionLeaderboard : globalBatakLeaderboard)
                .length === 0 ? (
                <p className="font-body text-sm text-gray-500 text-center py-4">
                  Aucun score enregistré
                </p>
              ) : (
                <div className="space-y-2">
                  {(activeTab === "reaction" ? globalReactionLeaderboard : globalBatakLeaderboard)
                    .slice(0, 10)
                    .map((entry: any, i: any) => (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          entry.user_id === user?.id
                            ? "bg-cyan-500/10 border border-cyan-500/30"
                            : ""
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center ${
                            i === 0
                              ? "position-1-gaming"
                              : i === 1
                                ? "position-2-gaming"
                                : i === 2
                                  ? "position-3-gaming"
                                  : "bg-gray-700"
                          }`}
                        >
                          <span
                            className={`font-heading text-sm ${i < 3 && i !== 2 ? "text-black" : "text-white"}`}
                          >
                            {entry.position}
                          </span>
                        </div>
                        <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                        <span className="font-body text-sm text-white flex-1 truncate">
                          {entry.username}
                        </span>
                        <span
                          className={`font-data text-sm ${
                            activeTab === "reaction" ? "text-orange-400" : "text-cyan-400"
                          }`}
                        >
                          {activeTab === "reaction"
                            ? `${entry.best_score}ms`
                            : `${entry.best_score} pts`}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
