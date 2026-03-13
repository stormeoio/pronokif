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

  const fetchData = useCallback(async () => {
    try {
      const [leaguesRes, predictionsRes, avatarsRes, globalLbRes] = await Promise.all([
        apiClient.get("/leagues/my"),
        apiClient.get("/predictions/history"),
        apiClient.get("/avatars"),
        apiClient.get("/leaderboard/global")
      ]);

      setLeagues(leaguesRes.data);
      setPredictions(predictionsRes.data);
      setAvatars(avatarsRes.data);
      setGlobalPosition(globalLbRes.data.my_position);
      setStats({ totalPredictions: predictionsRes.data.length, totalPoints: 0 });

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
      const res = await apiClient.post("/user/avatar", { avatar_id: avatarId });
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
      <div className="min-h-screen p-4 pt-6" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-24 skeleton-gaming rounded-md" />
          <div className="h-32 skeleton-gaming rounded-md" />
          <div className="h-48 skeleton-gaming rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-6 pb-24" data-testid="profile-page"
         style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #151c2c 50%, #0a0f1a 100%)' }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card className="game-card racing-stripe">
          <CardContent className="p-6 pt-8">
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
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center border-2 border-gray-900 hover:bg-orange-400 transition-colors"
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
                  <div className="level-badge px-3 py-1 rounded-lg">
                    <span className="font-heading text-sm text-cyan-400">Niv. {user.level || 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-data text-sm text-yellow-500">XP {user.xp || 0}</span>
                  </div>
                </div>
                {/* Global Ranking */}
                {globalPosition && (
                  <div className="flex items-center gap-1 mt-1">
                    <Globe className="w-3 h-3 text-gray-500" />
                    <span className="font-body text-xs text-gray-500">
                      Rang mondial: <span className="text-cyan-400">#{globalPosition}</span>
                    </span>
                  </div>
                )}
              </div>
              
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-500" data-testid="logout-btn">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="game-card">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{stats.totalPoints}</p>
              <p className="font-body text-xs text-gray-400 uppercase">Points totaux</p>
            </CardContent>
          </Card>
          <Card className="game-card">
            <CardContent className="p-4 text-center">
              <Target className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="font-data text-2xl text-white">{stats.totalPredictions}</p>
              <p className="font-body text-xs text-gray-400 uppercase">Pronostics</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links - New features */}
        <Card className="game-card overflow-hidden">
          <CardContent className="p-0">
            <button onClick={() => navigate("/missions")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-missions">
              <div className="flex items-center gap-3">
                <Medal className="w-5 h-5 text-yellow-500" />
                <div className="text-left">
                  <span className="font-body text-white block">Missions</span>
                  <span className="font-body text-xs text-gray-500">Gagne de l'XP en complétant des missions</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/minigames")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-minigames">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-5 h-5 text-purple-500" />
                <div className="text-left">
                  <span className="font-body text-white block">Mini-Jeux</span>
                  <span className="font-body text-xs text-gray-500">Reaction Time & Batak Pro</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/custom-predictions")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-custom-predictions">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-pink-500" />
                <div className="text-left">
                  <span className="font-body text-white block">Pronos Perso</span>
                  <span className="font-body text-xs text-gray-500">Crée des pronostics fun pour ta ligue</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/leaderboard/global")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-global-leaderboard">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-cyan-500" />
                <div className="text-left">
                  <span className="font-body text-white block">Classement Global</span>
                  <span className="font-body text-xs text-gray-500">Tous les joueurs PRONOKIF</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </CardContent>
        </Card>

        {/* My Leagues */}
        <Card className="game-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg uppercase tracking-tight flex items-center gap-2 text-cyan-400">
                <Users className="w-5 h-5" />Mes ligues
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/league")} className="text-orange-500 hover:text-orange-400 font-body text-sm" data-testid="add-league-btn">
                <Plus className="w-4 h-4 mr-1" />Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {leagues.map((league) => (
              <div key={league.id} className={`p-4 border-b border-gray-800 ${league.id === user.current_league_id ? 'bg-orange-500/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <p className={`font-heading text-sm uppercase tracking-tight ${league.id === user.current_league_id ? 'text-orange-400' : 'text-white'}`}>
                      {league.name}
                      {league.id === user.current_league_id && <Star className="w-3 h-3 inline ml-1 text-yellow-500 fill-current" />}
                    </p>
                    <p className="font-body text-xs text-gray-500">
                      {league.members.length} membres • Code: <span className="font-data text-yellow-500">{league.code}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => copyCode(league.code)} className="text-gray-400 hover:text-white h-8 w-8">
                      {copied === league.code ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => shareLeague(league)} className="text-gray-400 hover:text-white h-8 w-8">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {league.id !== user.current_league_id && (
                  <Button variant="outline" size="sm" onClick={() => selectLeague(league.id)} className="w-full mt-2 border-gray-700 text-xs font-body">
                    Sélectionner cette ligue
                  </Button>
                )}
              </div>
            ))}

            {leagues.length === 0 && (
              <div className="p-6 text-center">
                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-body text-gray-500 text-sm">Aucune ligue</p>
                <Button onClick={() => navigate("/league")} className="mt-3 btn-gaming" size="sm">
                  Créer / Rejoindre
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Links */}
        <Card className="game-card">
          <CardContent className="p-0">
            <button onClick={() => navigate("/leaderboard")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-leaderboard">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-body text-white">Classement Ligue</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/results")} className="w-full p-4 flex items-center justify-between border-b border-gray-800 hover:bg-white/5 transition-colors" data-testid="nav-results">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-cyan-500" />
                <span className="font-body text-white">Historique des résultats</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => navigate("/admin")} className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors" data-testid="nav-admin">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-orange-500" />
                <span className="font-body text-white">Administration</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button variant="outline" onClick={handleLogout} className="w-full h-12 border-red-500/30 text-red-500 hover:bg-red-500/10 font-heading uppercase tracking-wider" data-testid="logout-btn-bottom">
          <LogOut className="w-4 h-4 mr-2" />Déconnexion
        </Button>

        {/* App Info */}
        <p className="text-center text-gray-600 text-xs font-body">
          PRONOKIF v2.0 • Made with passion for F1
        </p>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowAvatarModal(false)}>
          <div className="bg-gray-900 rounded-lg border border-orange-500/30 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gray-900 p-4 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-lg uppercase text-orange-500">Choisir un Avatar</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowAvatarModal(false)}>
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
