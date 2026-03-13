import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { 
  ChevronLeft, Zap, Target, Trophy, Medal, Dumbbell, Timer,
  Crown, Users
} from "lucide-react";
import { ReactionGame, BatakGame } from "../components/MiniGames";
import { AvatarDisplay } from "../components/AvatarDisplay";

export default function MiniGamesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [nextRace, setNextRace] = useState(null);
  const [activeTab, setActiveTab] = useState("reaction"); // reaction, batak
  const [mode, setMode] = useState("training"); // training, competition
  const [avatars, setAvatars] = useState({});
  
  // Attempts tracking
  const [reactionAttempts, setReactionAttempts] = useState({ used: 0, remaining: 3 });
  const [batakAttempts, setBatakAttempts] = useState({ used: 0, remaining: 3 });
  
  // Leaderboards
  const [reactionLeaderboard, setReactionLeaderboard] = useState([]);
  const [batakLeaderboard, setBatakLeaderboard] = useState([]);
  const [globalReactionLeaderboard, setGlobalReactionLeaderboard] = useState([]);
  const [globalBatakLeaderboard, setGlobalBatakLeaderboard] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [leaguesRes, raceRes, avatarsRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/races/next"),
        apiClient.get("/avatars")
      ]);

      setLeagues(leaguesRes.data);
      setNextRace(raceRes.data);
      setAvatars(avatarsRes.data);

      if (leaguesRes.data.length > 0) {
        setSelectedLeague(leaguesRes.data[0]);
      }

      // Fetch global leaderboards
      const [globalReactionRes, globalBatakRes] = await Promise.all([
        apiClient.get("/minigames/global-leaderboard/reaction"),
        apiClient.get("/minigames/global-leaderboard/batak")
      ]);
      setGlobalReactionLeaderboard(globalReactionRes.data.leaderboard || []);
      setGlobalBatakLeaderboard(globalBatakRes.data.leaderboard || []);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeagueData = useCallback(async () => {
    if (!selectedLeague || !nextRace) return;

    try {
      // Fetch attempts
      const [reactionAttemptsRes, batakAttemptsRes] = await Promise.all([
        apiClient.get(`/minigames/attempts/reaction/${selectedLeague.id}/${nextRace.id}`),
        apiClient.get(`/minigames/attempts/batak/${selectedLeague.id}/${nextRace.id}`)
      ]);

      setReactionAttempts({
        used: reactionAttemptsRes.data.attempts_used,
        remaining: reactionAttemptsRes.data.attempts_remaining
      });
      setBatakAttempts({
        used: batakAttemptsRes.data.attempts_used,
        remaining: batakAttemptsRes.data.attempts_remaining
      });

      // Fetch leaderboards
      const [reactionLbRes, batakLbRes] = await Promise.all([
        apiClient.get(`/minigames/leaderboard/reaction/${selectedLeague.id}/${nextRace.id}`),
        apiClient.get(`/minigames/leaderboard/batak/${selectedLeague.id}/${nextRace.id}`)
      ]);

      setReactionLeaderboard(reactionLbRes.data.leaderboard || []);
      setBatakLeaderboard(batakLbRes.data.leaderboard || []);
    } catch (e) {
      console.error(e);
    }
  }, [selectedLeague, nextRace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedLeague && nextRace) {
      fetchLeagueData();
    }
  }, [selectedLeague, nextRace, fetchLeagueData]);

  const handleReactionSubmit = async (reactionTime, isTraining) => {
    try {
      await apiClient.post("/minigames/reaction", {
        race_id: nextRace.id,
        league_id: selectedLeague?.id || "training",
        reaction_time_ms: reactionTime,
        is_training: isTraining
      });

      if (!isTraining) {
        toast.success(`Temps enregistré: ${reactionTime}ms`);
        fetchLeagueData();
      } else {
        toast.success(`Temps: ${reactionTime}ms (Entraînement)`);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  const handleBatakSubmit = async (score, timeSeconds, isTraining) => {
    try {
      await apiClient.post("/minigames/batak", {
        race_id: nextRace.id,
        league_id: selectedLeague?.id || "training",
        score,
        time_seconds: timeSeconds,
        is_training: isTraining
      });

      if (!isTraining) {
        toast.success(`Score enregistré: ${score} cibles`);
        fetchLeagueData();
      } else {
        toast.success(`Score: ${score} cibles (Entraînement)`);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  const getAvatarById = (avatarId) => {
    return avatars?.all?.find(a => a.id === avatarId) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 skeleton-gaming rounded" />
          <div className="h-64 skeleton-gaming rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" data-testid="minigames-page" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-md border-b border-orange-500/30">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="flex-1">
              <h1 className="font-heading text-xl uppercase tracking-tight text-orange-500 flex items-center gap-2">
                <Zap className="w-5 h-5" />
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
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            onClick={() => setMode("training")}
            className={`flex-1 h-12 font-heading uppercase ${
              mode === "training" ? "btn-gaming-blue" : "bg-gray-800 text-gray-400"
            }`}
          >
            <Dumbbell className="w-5 h-5 mr-2" />
            Entraînement
          </Button>
          <Button
            onClick={() => setMode("competition")}
            className={`flex-1 h-12 font-heading uppercase ${
              mode === "competition" ? "btn-gaming" : "bg-gray-800 text-gray-400"
            }`}
            disabled={leagues.length === 0}
          >
            <Trophy className="w-5 h-5 mr-2" />
            Compétition
          </Button>
        </div>

        {/* League selector (competition mode) */}
        {mode === "competition" && leagues.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {leagues.map(league => (
              <Button
                key={league.id}
                onClick={() => setSelectedLeague(league)}
                variant={selectedLeague?.id === league.id ? "default" : "outline"}
                className={`flex-shrink-0 ${selectedLeague?.id === league.id ? "btn-gaming" : ""}`}
              >
                {league.name}
              </Button>
            ))}
          </div>
        )}

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
            <Zap className={`w-6 h-6 mx-auto mb-1 ${activeTab === "reaction" ? "text-orange-500" : "text-gray-500"}`} />
            <p className={`font-heading text-sm uppercase ${activeTab === "reaction" ? "text-white" : "text-gray-400"}`}>
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
            <Target className={`w-6 h-6 mx-auto mb-1 ${activeTab === "batak" ? "text-cyan-500" : "text-gray-500"}`} />
            <p className={`font-heading text-sm uppercase ${activeTab === "batak" ? "text-white" : "text-gray-400"}`}>
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
              {mode === "competition" && selectedLeague && (
                <span className="text-gray-500 text-xs ml-2">({selectedLeague.name})</span>
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
                {(activeTab === "reaction" ? reactionLeaderboard : batakLeaderboard).length === 0 ? (
                  <p className="font-body text-sm text-gray-500 text-center py-4">
                    Aucun score enregistré pour ce weekend
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(activeTab === "reaction" ? reactionLeaderboard : batakLeaderboard).slice(0, 10).map((entry, i) => (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          entry.user_id === user?.id ? "bg-orange-500/10 border border-orange-500/30" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded flex items-center justify-center ${
                          i === 0 ? "position-1-gaming" : i === 1 ? "position-2-gaming" : i === 2 ? "position-3-gaming" : "bg-gray-700"
                        }`}>
                          <span className={`font-heading text-sm ${i < 3 && i !== 2 ? "text-black" : "text-white"}`}>
                            {entry.position}
                          </span>
                        </div>
                        <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                        <span className="font-body text-sm text-white flex-1 truncate">
                          {entry.username}
                        </span>
                        <span className={`font-data text-sm ${
                          activeTab === "reaction" ? "text-orange-400" : "text-cyan-400"
                        }`}>
                          {activeTab === "reaction" ? `${entry.best_score}ms` : `${entry.best_score} pts`}
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
              {(activeTab === "reaction" ? globalReactionLeaderboard : globalBatakLeaderboard).length === 0 ? (
                <p className="font-body text-sm text-gray-500 text-center py-4">
                  Aucun score enregistré
                </p>
              ) : (
                <div className="space-y-2">
                  {(activeTab === "reaction" ? globalReactionLeaderboard : globalBatakLeaderboard).slice(0, 10).map((entry, i) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        entry.user_id === user?.id ? "bg-cyan-500/10 border border-cyan-500/30" : ""
                      }`}
                    >
                      <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        i === 0 ? "position-1-gaming" : i === 1 ? "position-2-gaming" : i === 2 ? "position-3-gaming" : "bg-gray-700"
                      }`}>
                        <span className={`font-heading text-sm ${i < 3 && i !== 2 ? "text-black" : "text-white"}`}>
                          {entry.position}
                        </span>
                      </div>
                      <AvatarDisplay avatar={getAvatarById(entry.avatar_id)} size="sm" />
                      <span className="font-body text-sm text-white flex-1 truncate">
                        {entry.username}
                      </span>
                      <span className={`font-data text-sm ${
                        activeTab === "reaction" ? "text-orange-400" : "text-cyan-400"
                      }`}>
                        {activeTab === "reaction" ? `${entry.best_score}ms` : `${entry.best_score} pts`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-gray-800/30 border-gray-700">
          <CardContent className="p-4">
            <h3 className="font-heading text-sm uppercase text-yellow-500 mb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Récompenses
            </h3>
            <ul className="font-body text-xs text-gray-400 space-y-1">
              <li>• Mode compétition: 3 essais par jeu et par weekend</li>
              <li>• Le gagnant de chaque jeu dans la ligue gagne <span className="text-orange-400">+2 points</span></li>
              <li>• XP gagné à chaque partie jouée</li>
              <li>• Mode entraînement illimité pour s'améliorer!</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
