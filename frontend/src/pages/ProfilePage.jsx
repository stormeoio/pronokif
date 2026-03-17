import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiClient } from "../App";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { 
  User, LogOut, Trophy, Target, Users, ChevronRight,
  Plus, History, Share2, Copy, Check, Zap, Star, Shield,
  Gamepad2, Medal, Edit, Crown, Globe, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { AvatarDisplay, AvatarSelector } from "../components/AvatarDisplay";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [leagues, setLeagues] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stats, setStats] = useState({ totalPredictions: 0, totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [avatars, setAvatars] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [globalPosition, setGlobalPosition] = useState(null);
  const [pointsHistory, setPointsHistory] = useState({ history: [], summary: {} });
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [leaguesRes, predictionsRes, statsRes, avatarsRes, globalLbRes, historyRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/predictions/history"),
        apiClient.get("/predictions/stats"),
        apiClient.get("/avatars"),
        apiClient.get("/leaderboard/global"),
        apiClient.get("/predictions/points-history")
      ]);

      setLeagues(leaguesRes.data);
      setPredictions(predictionsRes.data);
      setAvatars(avatarsRes.data);
      setGlobalPosition(globalLbRes.data.my_position);
      setPointsHistory(historyRes.data);
      setStats({ 
        totalPredictions: statsRes.data.total_predictions, 
        racesParticipated: statsRes.data.races_participated,
        totalPoints: historyRes.data.summary?.total_points || 0 
      });

      if (user.current_league_id) {
        try {
          const leaderboardRes = await apiClient.get(`/leagues/${user.current_league_id}/leaderboard`);
          const myEntry = leaderboardRes.data.find(e => e.user_id === user.id);
          if (myEntry) {
            setStats(prev => ({ ...prev, totalPoints: myEntry.total_points }));
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.current_league_id, user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success("Code copié !");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const shareLeague = async (league) => {
    const shareText = `Rejoins ma ligue F1 "${league.name}" sur PRONOKIF ! Code: ${league.code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: "PRONOKIF", text: shareText });
      } catch (e) {
        if (e.name !== "AbortError") copyCode(league.code);
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  const selectLeague = async (leagueId) => {
    try {
      await apiClient.post(`/leagues/${leagueId}/select`);
      toast.success("Ligue sélectionnée !");
      window.location.reload();
    } catch {
      toast.error("Erreur");
    }
  };

  const handleAvatarSelect = async (avatarId) => {
    try {
      await apiClient.post("/user/avatar", { avatar_id: avatarId });
      if (updateUser) {
        updateUser({ avatar_id: avatarId, custom_avatar_url: null });
      }
      toast.success("Avatar mis à jour !");
      setShowAvatarModal(false);
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/user/avatar/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (updateUser) {
        updateUser({ avatar_id: null, custom_avatar_url: res.data.avatar_url });
      }
      toast.success("Photo uploadée !");
      setShowAvatarModal(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'upload");
    }
  };

  const getAvatarById = (avatarId) => {
    return avatars?.all?.find(a => a.id === avatarId) || null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app-main p-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton-arcade rounded-lg" />
          <div className="h-32 skeleton-arcade rounded-lg" />
          <div className="h-48 skeleton-arcade rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-main p-4 pt-6 pb-24" data-testid="profile-page">
      
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Profile Header */}
        <div className="card-arcade p-5">
          <div className="flex items-center gap-4">
            {/* Avatar with edit button */}
            <div className="relative">
              <AvatarDisplay 
                avatar={getAvatarById(user.avatar_id)} 
                customUrl={user.custom_avatar_url}
                size="xl" 
              />
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-blue-400 shadow-lg hover:bg-blue-500 transition-colors glow-blue"
                data-testid="edit-avatar-btn"
              >
                <Edit className="w-4 h-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              <h1 className="font-heading text-2xl uppercase tracking-tight text-white">
                {user.username}
              </h1>
              <p className="font-body text-sm text-gray-400">{user.email}</p>
              {/* Level & XP */}
              <div className="flex items-center gap-3 mt-2">
                <div className="bg-blue-500/20 border border-blue-500/50 px-3 py-1 rounded-lg">
                  <span className="font-heading text-sm text-blue-400">Niv. {user.level || 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="font-data text-sm text-yellow-400">{user.xp || 0} XP</span>
                </div>
              </div>
              {/* Global Ranking */}
              {globalPosition && (
                <div className="flex items-center gap-1 mt-1">
                  <Globe className="w-3 h-3 text-gray-500" />
                  <span className="font-body text-xs text-gray-400">
                    Rang mondial: <span className="text-cyan-400 font-semibold">#{globalPosition}</span>
                  </span>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-500 hover:text-red-400 hover:bg-red-500/10" data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card-gold p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-700 mx-auto mb-2" />
            <p className="font-data text-2xl text-yellow-800">{stats.totalPoints}</p>
            <p className="font-body text-xs text-yellow-700 uppercase">Points totaux</p>
          </div>
          <div className="card-racing p-4 text-center">
            <Target className="w-8 h-8 text-white mx-auto mb-2" />
            <p className="font-data text-2xl text-white">{stats.totalPredictions}</p>
            <p className="font-body text-xs text-white/80 uppercase">Pronostics</p>
          </div>
        </div>

        {/* Points History Section */}
        <div className="card-arcade overflow-hidden">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            data-testid="toggle-points-history"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <span className="font-body text-white font-semibold block">Historique des points</span>
                <span className="font-body text-xs text-gray-400">
                  {pointsHistory.summary?.races_with_results || 0} courses avec résultats
                </span>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </button>
          
          {showHistory && (
            <div className="border-t border-gray-700/50">
              {pointsHistory.history?.length === 0 ? (
                <div className="p-6 text-center">
                  <History className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="font-body text-gray-400 text-sm">Aucun historique disponible</p>
                  <p className="font-body text-gray-500 text-xs">Fais des pronostics pour voir ton historique</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/30 max-h-96 overflow-y-auto">
                  {pointsHistory.history?.map((race) => (
                    <div key={race.race_id} className="p-4">
                      {/* Race Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-heading text-sm text-white uppercase">
                            {race.race_name?.replace(" Grand Prix", "")}
                          </h4>
                          {race.is_sprint_weekend && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-heading">SPRINT</span>
                          )}
                        </div>
                        <div className="text-right">
                          {race.has_results ? (
                            <span className="font-data text-xl text-green-400">+{race.total_points} pts</span>
                          ) : (
                            <span className="font-body text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">En attente</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Points Breakdown */}
                      {race.has_results && race.points_breakdown && (
                        <div className="space-y-2">
                          {/* Main Race */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-400">Pole</span>
                              <span className={race.points_breakdown.quali_pole.points > 0 ? 'text-green-400' : 'text-gray-600'}>
                                +{race.points_breakdown.quali_pole.points}
                              </span>
                            </div>
                            <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-400">Top 10 Quali</span>
                              <span className={race.points_breakdown.quali_top10.points > 0 ? 'text-green-400' : 'text-gray-600'}>
                                +{race.points_breakdown.quali_top10.points}
                              </span>
                            </div>
                            <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-400">Vainqueur</span>
                              <span className={race.points_breakdown.race_winner.points > 0 ? 'text-green-400' : 'text-gray-600'}>
                                +{race.points_breakdown.race_winner.points}
                              </span>
                            </div>
                            <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                              <span className="text-gray-400">Top 10 Course</span>
                              <span className={race.points_breakdown.race_top10.points > 0 ? 'text-green-400' : 'text-gray-600'}>
                                +{race.points_breakdown.race_top10.points}
                              </span>
                            </div>
                          </div>
                          
                          {/* Sprint Breakdown if applicable */}
                          {race.is_sprint_weekend && race.sprint_breakdown && (
                            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                              <div className="flex justify-between bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                                <span className="text-yellow-400/70">Sprint Quali</span>
                                <span className={race.sprint_breakdown.sprint_quali_top10.points > 0 ? 'text-yellow-400' : 'text-gray-600'}>
                                  +{race.sprint_breakdown.sprint_quali_top10.points}
                                </span>
                              </div>
                              <div className="flex justify-between bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                                <span className="text-yellow-400/70">Sprint Course</span>
                                <span className={race.sprint_breakdown.sprint_race_top10.points > 0 ? 'text-yellow-400' : 'text-gray-600'}>
                                  +{race.sprint_breakdown.sprint_race_top10.points}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Bonus */}
                          <div className="flex justify-between bg-purple-500/10 p-2 rounded border border-purple-500/20 text-xs">
                            <span className="text-purple-400/70">Bonus (SC, DNF, Tour, T1)</span>
                            <span className={race.points_breakdown.bonus.points > 0 ? 'text-purple-400' : 'text-gray-600'}>
                              +{race.points_breakdown.bonus.points}
                            </span>
                          </div>
                          
                          {/* Details */}
                          {race.details && race.details.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700/30">
                              <div className="flex flex-wrap gap-1">
                                {race.details.map((detail, i) => (
                                  <span key={i} className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded">
                                    {detail}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="card-arcade overflow-hidden">
          <div className="divide-y divide-gray-700/50">
            <button onClick={() => navigate("/missions")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-missions">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center">
                  <Medal className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-body text-white font-semibold block">Missions</span>
                  <span className="font-body text-xs text-gray-400">Gagne de l'XP</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/minigames")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-minigames">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-body text-white font-semibold block">Mini-Jeux</span>
                  <span className="font-body text-xs text-gray-400">Reaction & Batak</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/custom-predictions")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-custom-predictions">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-body text-white font-semibold block">Pronos Perso</span>
                  <span className="font-body text-xs text-gray-400">Crée des pronos fun</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/leaderboard/global")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-global-leaderboard">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-body text-white font-semibold block">Classement Global</span>
                  <span className="font-body text-xs text-gray-400">Tous les joueurs</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* My Leagues */}
        <div className="card-arcade overflow-hidden">
          <div className="h-2 bg-kerb-stripe" />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg text-white uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Mes ligues
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate("/league")} className="text-cyan-400 font-body text-sm hover:bg-cyan-500/10">
                <Plus className="w-4 h-4 mr-1" />Ajouter
              </Button>
            </div>
            
            <div className="space-y-2">
              {leagues.map((league) => (
                <div key={league.id} className={`p-3 rounded-lg ${league.id === user.current_league_id ? 'bg-blue-500/20 border border-blue-500/50' : 'bg-white/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`font-heading text-sm uppercase ${league.id === user.current_league_id ? 'text-blue-400' : 'text-gray-300'}`}>
                        {league.name}
                        {league.id === user.current_league_id && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-yellow-500" />}
                      </p>
                      <p className="font-body text-xs text-gray-400">
                        {league.members.length} membres • Code: <span className="font-data text-cyan-400">{league.code}</span>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyCode(league.code)} className="text-gray-500 hover:text-white hover:bg-white/10 h-8 w-8">
                        {copied === league.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => shareLeague(league)} className="text-gray-500 hover:text-white hover:bg-white/10 h-8 w-8">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {league.id !== user.current_league_id && (
                    <Button onClick={() => selectLeague(league.id)} className="w-full mt-2 btn-neon text-xs h-8">
                      Sélectionner
                    </Button>
                  )}
                </div>
              ))}

              {leagues.length === 0 && (
                <div className="text-center py-6">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="font-body text-gray-400 text-sm">Aucune ligue</p>
                  <Button onClick={() => navigate("/league")} className="mt-3 btn-racing" size="sm">
                    Créer / Rejoindre
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Links */}
        <div className="card-arcade overflow-hidden divide-y divide-gray-700/50">
          <button onClick={() => navigate("/leaderboard")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-leaderboard">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-body text-gray-300 font-semibold">Classement Ligue</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
          <button onClick={() => navigate("/admin")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-admin">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-500" />
              <span className="font-body text-gray-300 font-semibold">Administration</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Logout Button */}
        <Button onClick={handleLogout} className="w-full h-12 bg-red-500/10 border-2 border-red-500/50 text-red-400 hover:bg-red-500/20 font-heading uppercase tracking-wider rounded-xl" data-testid="logout-btn-bottom">
          <LogOut className="w-4 h-4 mr-2" />Déconnexion
        </Button>

        {/* App Info */}
        <p className="text-center text-gray-500 text-xs font-body">
          PRONOKIF v3.0 • Made with passion for F1
        </p>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowAvatarModal(false)}>
          <div className="card-arcade w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600/20 to-transparent p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg uppercase text-white">Choisir un Avatar</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAvatarModal(false)} className="text-gray-400 hover:text-white hover:bg-white/10">
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-4">
              <AvatarSelector
                avatars={avatars}
                selectedId={user.avatar_id}
                onSelect={handleAvatarSelect}
                customUrl={user.custom_avatar_url}
                onUpload={handleAvatarUpload}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
